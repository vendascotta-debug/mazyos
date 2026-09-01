import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { consultar, estimarCusto } from "./bigquery.mjs";
import { mapaCnae, QUALIFICACAO, PORTE, SNAPSHOT, UF } from "./importar-cnpj.mjs";
import { condicaoNome, ignorado } from "./refinos.mjs";
import { classificarPorNome } from "./classificador.mjs";

// ---------------------------------------------------------------------------
// Carga completa, em UMA varredura.
//
//   node scripts/carga-completa.mjs estimar
//   node scripts/carga-completa.mjs rodar [teto-por-cnae]
//
// A versão anterior fazia uma consulta por subsegmento — 35 leituras da mesma
// tabela, o que torrou a cota mensal do BigQuery em um dia. Aqui é uma consulta
// só, com teto por CNAE via ROW_NUMBER: CNAE pequeno entra inteiro, CNAE gigante
// entra até o teto, ordenado por porte e capital. Assim hotel não fica com 98%
// enquanto restaurante fica com 6%.
// ---------------------------------------------------------------------------

const TETO_PADRAO = 25_000;

function env(nome) {
  const linha = fs
    .readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(nome + "="));
  return linha ? linha.slice(linha.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}

const SCHEMA = env("DB_SCHEMA") || "public";

function conectar() {
  const url = new URL(env("DATABASE_URL"));
  url.searchParams.delete("channel_binding");
  return postgres(url.toString(), { prepare: false, ssl: "require", max: 4, onnotice: () => {} });
}

// --- consulta --------------------------------------------------------------

async function montarSql(teto, apenasSegmento = null, semSocios = false) {
  const mapa = await mapaCnae();

  // Agrupa CNAEs em dois baldes: os que valem por si e os que só entram com
  // filtro de nome (CNAE amplo demais, como "consultoria em gestão").
  const diretos = [];
  const comNome = [];
  for (const [cnae, { segmento, subsegmento }] of mapa) {
    if (ignorado(subsegmento)) continue;
    if (apenasSegmento && segmento !== apenasSegmento) continue;
    const cond = condicaoNome(subsegmento);
    if (cond) comNome.push({ cnae, cond });
    else diretos.push(cnae);
  }

  const grupos = [];
  if (diretos.length) {
    grupos.push(`est.cnae_fiscal_principal IN (${[...new Set(diretos)].map((c) => `'${c}'`).join(",")})`);
  }
  for (const { cnae, cond } of comNome) {
    grupos.push(`(est.cnae_fiscal_principal = '${cnae}' AND ${cond})`);
  }

  // O quadro societario e o pedaco mais caro da varredura. Quando a cota
  // aperta, da para trazer as empresas sem ele e enriquecer depois.
  const colunaSocios = semSocios ? "CAST(NULL AS STRING) AS socios," : "soc.socios,";
  const joinSocios = semSocios
    ? ""
    : `LEFT JOIN (
        SELECT cnpj_basico, TO_JSON_STRING(ARRAY_AGG(
                 STRUCT(nome, qualificacao, data_entrada_sociedade AS entrada) LIMIT 4
               )) AS socios
        FROM \`basedosdados.br_me_cnpj.socios\` WHERE data = '${SNAPSHOT}'
        GROUP BY cnpj_basico
      ) soc ON soc.cnpj_basico = est.cnpj_basico`;

  return `
    WITH base AS (
      SELECT
        est.cnpj, est.nome_fantasia, emp.razao_social,
        emp.capital_social, emp.porte, est.data_inicio_atividade,
        est.cnae_fiscal_principal,
        est.tipo_logradouro, est.logradouro, est.numero,
        est.bairro, est.cep, est.ddd_1, est.telefone_1, est.email,
        est.id_municipio,
        ${colunaSocios}
        ROW_NUMBER() OVER (
          PARTITION BY est.cnae_fiscal_principal
          ORDER BY CASE emp.porte WHEN '5' THEN 0 WHEN '3' THEN 1 ELSE 2 END,
                   emp.capital_social DESC
        ) AS posicao
      FROM \`basedosdados.br_me_cnpj.estabelecimentos\` est
      LEFT JOIN (
        SELECT cnpj_basico, razao_social, capital_social, porte
        FROM \`basedosdados.br_me_cnpj.empresas\` WHERE data = '${SNAPSHOT}'
      ) emp ON emp.cnpj_basico = est.cnpj_basico
      ${joinSocios}
      WHERE est.data = '${SNAPSHOT}'
        AND est.sigla_uf = '${UF}'
        AND est.situacao_cadastral = '2'
        AND (${grupos.join(" OR ")})
    )
    SELECT base.*, mun.nome AS municipio, mun.lat, mun.lng
    FROM base
    LEFT JOIN (
      SELECT d.id_municipio, d.nome,
             ST_Y(ST_CENTROID(g.geometria)) AS lat,
             ST_X(ST_CENTROID(g.geometria)) AS lng
      FROM \`basedosdados.br_bd_diretorios_brasil.municipio\` d
      JOIN \`basedosdados.br_geobr_mapas.municipio\` g USING (id_municipio)
      WHERE g.sigla_uf = '${UF}'
    ) mun ON mun.id_municipio = base.id_municipio
    WHERE base.posicao <= ${teto}
  `;
}

// --- conversão (mesma da carga anterior) -----------------------------------

const soDigitos = (s) => (s ?? "").replace(/\D/g, "");

const formatarCnpj = (c) => {
  const d = soDigitos(c).padStart(14, "0");
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

function formatarTelefone(ddd, numero) {
  const d = soDigitos(ddd);
  const n = soDigitos(numero);
  if (!d || n.length < 8) return null;
  return n.length >= 9 ? `(${d}) ${n.slice(0, 5)}-${n.slice(5, 9)}` : `(${d}) ${n.slice(0, 4)}-${n.slice(4, 8)}`;
}

const titulo = (s) =>
  (s ?? "")
    .toLowerCase()
    .replace(/\b[a-zà-ú]/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase())
    .trim();

function coordenada(lat, lng, cnpj) {
  if (lat == null || lng == null) return null;
  let h = 0;
  for (const ch of cnpj) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    lat: Number(lat) + (((h >> 10) % 1000) / 1000 - 0.5) * 0.06,
    lng: Number(lng) + ((h % 1000) / 1000 - 0.5) * 0.06,
  };
}

function estimarFuncionarios(porte, capital) {
  const c = Number(capital ?? 0);
  const p = String(porte ?? "").replace(/^0/, "");
  if (p === "5") return c >= 5_000_000 ? 180 : c >= 1_000_000 ? 90 : 55;
  if (p === "3") return c >= 500_000 ? 40 : 25;
  return c >= 100_000 ? 12 : c >= 20_000 ? 6 : 3;
}

const SUFIXO = {
  hospital: ["SERVICOS HOSPITALARES LTDA", "SERVICOS DE SAUDE LTDA"],
  escola: ["INSTITUICAO DE ENSINO LTDA", "EDUCACIONAL LTDA"],
  asilo: ["ASSISTENCIA AO IDOSO LTDA"],
  hotel: ["HOTELARIA LTDA"],
};

function converter(linha, mapa, agora) {
  const cnpj = soDigitos(linha.cnpj);
  if (cnpj.length !== 14) return null;

  const alvo = mapa.get(linha.cnae_fiscal_principal);
  if (!alvo) return null;

  const razao = titulo(linha.razao_social ?? "");
  const fantasia = titulo(linha.nome_fantasia ?? "");
  const nome = fantasia || razao;
  if (!nome) return null;

  const coord = coordenada(linha.lat, linha.lng, cnpj);
  if (!coord) return null;

  // O CNAE dá o universo; o nome decide entre restaurante, pizzaria e
  // churrascaria, que dividem o mesmo código na Receita.
  const subsegmento =
    classificarPorNome(linha.cnae_fiscal_principal, `${nome} ${razao}`) ?? alvo.subsegmento;

  const funcionarios = estimarFuncionarios(linha.porte, linha.capital_social);

  let qsa = [];
  try {
    qsa = (JSON.parse(linha.socios ?? "[]") ?? [])
      .filter((s) => s?.nome)
      .map((s) => ({
        nome: titulo(s.nome),
        qualificacao: QUALIFICACAO[String(s.qualificacao).padStart(2, "0")] ?? `Qualificação ${s.qualificacao}`,
        entrada: s.entrada ?? null,
        participacao: null,
      }));
  } catch {
    qsa = [];
  }

  return {
    id: `rf-${cnpj}`,
    segment_slug: alvo.segmento,
    subsegment_slug: subsegmento,
    name: nome,
    legal_name: razao || nome,
    cnpj: formatarCnpj(cnpj),
    street: [titulo(linha.tipo_logradouro), titulo(linha.logradouro)].filter(Boolean).join(" ") || null,
    number: linha.numero ?? null,
    neighborhood: titulo(linha.bairro ?? "") || null,
    city: linha.municipio ?? null,
    uf: UF,
    zip: soDigitos(linha.cep).slice(0, 8) || null,
    lat: coord.lat,
    lng: coord.lng,
    phone: formatarTelefone(linha.ddd_1, linha.telefone_1),
    whatsapp: null,
    email: (linha.email ?? "").toLowerCase().trim() || null,
    website: null,
    instagram: null,
    linkedin: null,
    rating: null,
    reviews_count: null,
    price_level: null,
    employees_range:
      funcionarios >= 100 ? "100+" : funcionarios >= 50 ? "50-99" : funcionarios >= 20 ? "20-49" : funcionarios >= 6 ? "6-19" : "1-5",
    units_count: 1,
    opened_at: linha.data_inicio_atividade ?? null,
    capital_social: linha.capital_social == null ? null : Number(linha.capital_social),
    porte: PORTE[linha.porte] ?? null,
    situacao: "ATIVA",
    cnae_principal: linha.cnae_fiscal_principal ?? null,
    cnae_principal_desc: null,
    cnae_secundarios: "[]",
    delivery_apps: "[]",
    hours: null,
    // A procedência é derivada na leitura (fontes() em repo.ts).
    sources: "[]",
    public_records: JSON.stringify({ qsa, mentions: [], employeesEstimate: funcionarios }),
    created_at: agora,
    updated_at: agora,
  };
}

// --- comandos --------------------------------------------------------------

async function estimar(teto) {
  const sql = await montarSql(teto);
  const custo = await estimarCusto(sql);
  console.log(`Varredura única: ${custo.gb} GB (franquia mensal: 1024 GB)`);
  console.log(`Teto por CNAE: ${teto.toLocaleString("pt-BR")}`);
}

async function rodar(teto, apenasSegmento = null, semSocios = false) {
  const consulta = await montarSql(teto, apenasSegmento, semSocios);
  const custo = await estimarCusto(consulta);
  console.log(`Varredura única: ${custo.gb} GB · teto de ${teto.toLocaleString("pt-BR")} por CNAE\n`);

  const linhas = await consultar(consulta, { maxLinhas: 400_000 });
  console.log(`\n${linhas.length.toLocaleString("pt-BR")} linhas recebidas do BigQuery`);

  const mapa = await mapaCnae();
  const agora = new Date().toISOString();
  const registros = linhas.map((l) => converter(l, mapa, agora)).filter(Boolean);
  console.log(`${registros.length.toLocaleString("pt-BR")} empresas válidas — gravando...`);

  const db = conectar();
  const COLS = Object.keys(registros[0]);
  for (let i = 0; i < registros.length; i += 500) {
    const lote = registros.slice(i, i + 500);
    await db`
      INSERT INTO ${db(SCHEMA)}.companies ${db(lote, ...COLS)}
      ON CONFLICT (id) DO NOTHING
    `;
    if (i % 10_000 === 0) process.stdout.write(`\r   ${i.toLocaleString("pt-BR")}/${registros.length.toLocaleString("pt-BR")}`);
  }

  const [{ n }] = await db`SELECT COUNT(*)::int AS n FROM ${db(SCHEMA)}.companies`;
  const [{ tamanho }] = await db`SELECT pg_size_pretty(pg_database_size(current_database())) AS tamanho`;
  console.log(`\n\nEmpresas na base: ${Number(n).toLocaleString("pt-BR")} · banco: ${tamanho}`);

  const dist = await db`
    SELECT segment_slug s, COUNT(*)::int n FROM ${db(SCHEMA)}.companies GROUP BY 1 ORDER BY n DESC
  `;
  for (const d of dist) console.log(`   ${String(d.n).padStart(7)}  ${d.s}`);
  await db.end({ timeout: 10 });
}

const cmd = process.argv[2];
const teto = Number(process.argv[3]) || TETO_PADRAO;

if (cmd === "estimar") estimar(teto).catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
else if (cmd === "rodar") rodar(teto, process.argv[4] || null, process.argv.includes("--sem-socios")).catch((e) => { console.error("\nERRO:", e.message); process.exit(1); });
else console.log("uso: node scripts/carga-completa.mjs [estimar|rodar] [teto-por-cnae]");
