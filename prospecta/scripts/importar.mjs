import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { consultar, estimarCusto } from "./bigquery.mjs";
import { mapaCnae, QUALIFICACAO, PORTE, SNAPSHOT, UF } from "./importar-cnpj.mjs";
import { condicaoNome, ignorado, REFINOS } from "./refinos.mjs";

// ---------------------------------------------------------------------------
// Traz empresas reais da Receita Federal para o banco do Prospecta.
//
//   node scripts/importar.mjs prever          -> quanto vem, por subsegmento
//   node scripts/importar.mjs importar 60000  -> importa até N empresas
//   node scripts/importar.mjs limpar-demo     -> remove a base de demonstração
//
// Prioriza porte e capital: numa base limitada, é melhor ter as 50 mil empresas
// com maior potencial de compra do que 500 mil MEIs.
// ---------------------------------------------------------------------------

// --- banco -----------------------------------------------------------------

function env(nome) {
  const arquivo = path.join(process.cwd(), ".env.local");
  const linha = fs.readFileSync(arquivo, "utf8").split(/\r?\n/).find((l) => l.trim().startsWith(nome + "="));
  return linha ? linha.slice(linha.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}

const SCHEMA = env("DB_SCHEMA") || "public";

function conectar() {
  const url = new URL(env("DATABASE_URL"));
  url.searchParams.delete("channel_binding");
  return postgres(url.toString(), { prepare: false, ssl: "require", max: 4, onnotice: () => {} });
}

// --- SQL -------------------------------------------------------------------

function selectPorSubsegmento(cnaes, subsegmento) {
  const lista = cnaes.map((c) => `'${c}'`).join(",");
  const filtroNome = condicaoNome(subsegmento);

  return `
    SELECT
      est.cnpj, est.cnpj_basico, est.nome_fantasia, emp.razao_social,
      emp.capital_social, emp.porte, est.data_inicio_atividade,
      est.cnae_fiscal_principal,
      est.tipo_logradouro, est.logradouro, est.numero, est.complemento,
      est.bairro, est.cep, est.ddd_1, est.telefone_1, est.email,
      est.identificador_matriz_filial,
      mun.nome AS municipio, mun.lat, mun.lng,
      soc.socios
    FROM \`basedosdados.br_me_cnpj.estabelecimentos\` est
    LEFT JOIN (
      SELECT cnpj_basico, razao_social, capital_social, porte
      FROM \`basedosdados.br_me_cnpj.empresas\` WHERE data = '${SNAPSHOT}'
    ) emp ON emp.cnpj_basico = est.cnpj_basico
    LEFT JOIN (
      SELECT cnpj_basico, TO_JSON_STRING(ARRAY_AGG(
               STRUCT(nome, qualificacao, data_entrada_sociedade AS entrada) LIMIT 4
             )) AS socios
      FROM \`basedosdados.br_me_cnpj.socios\` WHERE data = '${SNAPSHOT}'
      GROUP BY cnpj_basico
    ) soc ON soc.cnpj_basico = est.cnpj_basico
    LEFT JOIN (
      -- O nome do município está no diretório; as coordenadas, no mapa.
      SELECT d.id_municipio, d.nome,
             ST_Y(ST_CENTROID(g.geometria)) AS lat,
             ST_X(ST_CENTROID(g.geometria)) AS lng
      FROM \`basedosdados.br_bd_diretorios_brasil.municipio\` d
      JOIN \`basedosdados.br_geobr_mapas.municipio\` g USING (id_municipio)
      WHERE g.sigla_uf = '${UF}'
    ) mun ON mun.id_municipio = est.id_municipio
    WHERE est.data = '${SNAPSHOT}'
      AND est.sigla_uf = '${UF}'
      AND est.situacao_cadastral = '2'
      AND est.cnae_fiscal_principal IN (${lista})
      ${filtroNome ? `AND ${filtroNome}` : ""}
    ORDER BY
      CASE emp.porte WHEN '5' THEN 0 WHEN '3' THEN 1 ELSE 2 END,
      emp.capital_social DESC
  `;
}

/** Agrupa os CNAEs por subsegmento, já descartando os refinados como "ignorar". */
async function alvos() {
  const mapa = await mapaCnae();
  const porSub = new Map();
  for (const [cnae, { segmento, subsegmento }] of mapa) {
    if (ignorado(subsegmento)) continue;
    if (segmento === "saude") continue; // preview, fora da primeira carga
    const atual = porSub.get(subsegmento) ?? { segmento, cnaes: [] };
    atual.cnaes.push(cnae);
    porSub.set(subsegmento, atual);
  }
  return porSub;
}

// --- conversão -------------------------------------------------------------

const soDigitos = (s) => (s ?? "").replace(/\D/g, "");

function formatarCnpj(c) {
  const d = soDigitos(c).padStart(14, "0");
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

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

/**
 * Coordenada: a Receita não publica lat/lng, só endereço. Usamos o centro do
 * município com um deslocamento determinístico pelo CNPJ, para os pontos não
 * empilharem no mapa. É precisão de cidade, não de rua — e a interface diz isso.
 */
function coordenada(lat, lng, cnpj) {
  if (lat == null || lng == null) return null;
  let h = 0;
  for (const ch of cnpj) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const dx = ((h % 1000) / 1000 - 0.5) * 0.06;
  const dy = (((h >> 10) % 1000) / 1000 - 0.5) * 0.06;
  return { lat: Number(lat) + dy, lng: Number(lng) + dx };
}

/** Porte e capital são o que temos para estimar tamanho — e o motor de decisores depende disso. */
function estimarFuncionarios(porte, capital) {
  const c = Number(capital ?? 0);
  const p = String(porte ?? "").replace(/^0/, ""); // a Receita usa 1, 3, 5
  if (p === "5") return c >= 5_000_000 ? 180 : c >= 1_000_000 ? 90 : 55;
  if (p === "3") return c >= 500_000 ? 40 : 25;
  return c >= 100_000 ? 12 : c >= 20_000 ? 6 : 3;
}

function converter(linha, segmento, subsegmento, agora) {
  const cnpj = soDigitos(linha.cnpj);
  if (cnpj.length !== 14) return null;

  const razao = titulo(linha.razao_social ?? "");
  const fantasia = titulo(linha.nome_fantasia ?? "");
  const nome = fantasia || razao;
  if (!nome) return null;

  const coord = coordenada(linha.lat, linha.lng, cnpj);
  if (!coord) return null; // sem município resolvido não entra: quebraria o mapa

  const porte = PORTE[linha.porte] ?? null;
  const funcionarios = estimarFuncionarios(linha.porte, linha.capital_social);

  const qsa = (() => {
    try {
      return (JSON.parse(linha.socios ?? "[]") ?? [])
        .filter((s) => s?.nome)
        .map((s) => ({
          nome: titulo(s.nome),
          qualificacao: QUALIFICACAO[String(s.qualificacao).padStart(2, "0")] ?? `Qualificação ${s.qualificacao}`,
          entrada: s.entrada ?? null,
          participacao: null,
        }));
    } catch {
      return [];
    }
  })();

  const logradouro = [titulo(linha.tipo_logradouro), titulo(linha.logradouro)].filter(Boolean).join(" ");

  return {
    id: `rf-${cnpj}`,
    segment_slug: segmento,
    subsegment_slug: subsegmento,
    name: nome,
    legal_name: razao || nome,
    cnpj: formatarCnpj(cnpj),
    street: logradouro || null,
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
    porte,
    situacao: "ATIVA",
    cnae_principal: linha.cnae_fiscal_principal ?? null,
    cnae_principal_desc: null,
    cnae_secundarios: "[]",
    delivery_apps: "[]",
    hours: null,
    sources: JSON.stringify([
      {
        label: `Receita Federal — Dados Abertos do CNPJ (${SNAPSHOT})`,
        kind: "cnpj",
        collectedAt: agora,
      },
    ]),
    public_records: JSON.stringify({ qsa, mentions: [], employeesEstimate: funcionarios }),
    created_at: agora,
    updated_at: agora,
  };
}

// --- comandos --------------------------------------------------------------

/**
 * Uma varredura só, para todos os subsegmentos de uma vez.
 *
 * A versão anterior fazia uma consulta por subsegmento, e cada uma relia as
 * tabelas de empresas e sócios inteiras — 29 varreduras da mesma coisa, o que
 * estourou a cota gratuita. Aqui o CNAE volta na linha e a classificação
 * acontece do lado de cá.
 */
function selectUnico(porSub, limite) {
  const precisos = [];
  const comNome = [];
  for (const [sub, { cnaes }] of porSub) {
    const cond = condicaoNome(sub);
    if (cond) comNome.push(`(est.cnae_fiscal_principal IN (${cnaes.map((c) => `'${c}'`).join(",")}) AND ${cond})`);
    else precisos.push(...cnaes);
  }

  const grupos = [];
  if (precisos.length) grupos.push(`est.cnae_fiscal_principal IN (${[...new Set(precisos)].map((c) => `'${c}'`).join(",")})`);
  grupos.push(...comNome);

  return `
    SELECT
      est.cnpj, est.nome_fantasia, emp.razao_social,
      emp.capital_social, emp.porte, est.data_inicio_atividade,
      est.cnae_fiscal_principal,
      est.tipo_logradouro, est.logradouro, est.numero,
      est.bairro, est.cep, est.ddd_1, est.telefone_1, est.email,
      mun.nome AS municipio, mun.lat, mun.lng,
      soc.socios
    FROM \`basedosdados.br_me_cnpj.estabelecimentos\` est
    LEFT JOIN (
      SELECT cnpj_basico, razao_social, capital_social, porte
      FROM \`basedosdados.br_me_cnpj.empresas\` WHERE data = '${SNAPSHOT}'
    ) emp ON emp.cnpj_basico = est.cnpj_basico
    LEFT JOIN (
      SELECT cnpj_basico, TO_JSON_STRING(ARRAY_AGG(
               STRUCT(nome, qualificacao, data_entrada_sociedade AS entrada) LIMIT 4
             )) AS socios
      FROM \`basedosdados.br_me_cnpj.socios\` WHERE data = '${SNAPSHOT}'
      GROUP BY cnpj_basico
    ) soc ON soc.cnpj_basico = est.cnpj_basico
    LEFT JOIN (
      SELECT d.id_municipio, d.nome,
             ST_Y(ST_CENTROID(g.geometria)) AS lat,
             ST_X(ST_CENTROID(g.geometria)) AS lng
      FROM \`basedosdados.br_bd_diretorios_brasil.municipio\` d
      JOIN \`basedosdados.br_geobr_mapas.municipio\` g USING (id_municipio)
      WHERE g.sigla_uf = '${UF}'
    ) mun ON mun.id_municipio = est.id_municipio
    WHERE est.data = '${SNAPSHOT}'
      AND est.sigla_uf = '${UF}'
      AND est.situacao_cadastral = '2'
      AND (${grupos.join(" OR ")})
    ORDER BY
      CASE emp.porte WHEN '5' THEN 0 WHEN '3' THEN 1 ELSE 2 END,
      emp.capital_social DESC
    LIMIT ${limite}
  `;
}

/** Completa a base: só os subsegmentos que ainda não entraram. */
async function completar(limite) {
  const porSub = await alvos();
  const sql = conectar();

  const existentes = await sql`
    SELECT subsegment_slug AS sub, COUNT(*)::int AS n
    FROM ${sql(SCHEMA)}.companies WHERE id LIKE 'rf-%' GROUP BY 1
  `;
  const jaTem = new Map(existentes.map((r) => [r.sub, r.n]));

  const faltando = new Map([...porSub].filter(([sub]) => !jaTem.has(sub)));
  if (!faltando.size) {
    console.log("Nada faltando — todos os subsegmentos já têm empresas reais.");
    await sql.end({ timeout: 5 });
    return;
  }

  console.log(`Faltam ${faltando.size} subsegmentos: ${[...faltando.keys()].join(", ")}\n`);

  const consulta = selectUnico(faltando, limite);
  const custo = await estimarCusto(consulta);
  console.log(`Varredura única: ${custo.gb} GB\n`);

  const linhas = await consultar(consulta, { maxLinhas: limite });
  const mapa = await mapaCnae();
  const agora = new Date().toISOString();

  const registros = linhas
    .map((l) => {
      const alvo = mapa.get(l.cnae_fiscal_principal);
      return alvo ? converter(l, alvo.segmento, alvo.subsegmento, agora) : null;
    })
    .filter(Boolean);

  console.log(`${registros.length} empresas convertidas — gravando...`);
  await gravar(sql, registros);

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM ${sql(SCHEMA)}.companies WHERE id LIKE 'rf-%'`;
  const [{ tamanho }] = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS tamanho`;
  console.log(`\nEmpresas reais no banco: ${Number(n).toLocaleString("pt-BR")} | banco: ${tamanho}`);
  await sql.end({ timeout: 10 });
}

async function gravar(sql, registros) {
  if (!registros.length) return;
  const COLS = Object.keys(registros[0]);
  for (let i = 0; i < registros.length; i += 500) {
    const lote = registros.slice(i, i + 500);
    await sql`
      INSERT INTO ${sql(SCHEMA)}.companies ${sql(lote, ...COLS)}
      ON CONFLICT (id) DO NOTHING
    `;
    process.stdout.write(`\r   ${Math.min(i + 500, registros.length)}/${registros.length}`);
  }
  process.stdout.write("\n");
}

async function prever() {
  const porSub = await alvos();
  console.log(`Subsegmentos na carga: ${porSub.size}\n`);

  let total = 0;
  for (const [sub, { segmento, cnaes }] of porSub) {
    const sql = `SELECT COUNT(*) AS n FROM (${selectPorSubsegmento(cnaes, sub)})`;
    const r = await consultar(sql);
    const n = Number(r[0].n);
    total += n;
    const refino = REFINOS[sub]?.exigeNome ? " (com filtro de nome)" : "";
    console.log(`  ${String(n).padStart(8)}  ${segmento} / ${sub}${refino}`);
  }
  console.log(`\n  ${String(total).padStart(8)}  TOTAL`);
  console.log(`\nIgnorados de propósito:`);
  for (const [sub, r] of Object.entries(REFINOS)) if (r.ignorar) console.log(`  - ${sub}: ${r.motivo}`);
}

async function importar(limite) {
  const porSub = await alvos();
  const sql = conectar();
  const agora = new Date().toISOString();

  // Reparte a cota entre os subsegmentos, proporcional ao potencial de cada um,
  // para a base não virar só restaurante e pizzaria.
  const porSubArr = [...porSub.entries()];
  const cota = Math.max(300, Math.floor(limite / porSubArr.length));

  let gravadas = 0;
  for (const [sub, { segmento, cnaes }] of porSubArr) {
    process.stdout.write(`\n${segmento} / ${sub}: consultando...`);
    const linhas = await consultar(`${selectPorSubsegmento(cnaes, sub)} LIMIT ${cota}`, { maxLinhas: cota });

    const registros = linhas.map((l) => converter(l, segmento, sub, agora)).filter(Boolean);
    process.stdout.write(`\r${segmento} / ${sub}: ${registros.length} empresas — gravando...`);

    const COLS = Object.keys(registros[0] ?? {});
    for (let i = 0; i < registros.length; i += 500) {
      const lote = registros.slice(i, i + 500);
      const valores = lote.map((r) => COLS.map((c) => r[c]));
      await sql`
        INSERT INTO ${sql(SCHEMA)}.companies ${sql(lote, ...COLS)}
        ON CONFLICT (id) DO NOTHING
      `.catch(async () => {
        // Fallback sem helper, caso o formato do postgres.js não aceite o lote.
        for (const v of valores) {
          const marcas = v.map((_, k) => `$${k + 1}`).join(",");
          await sql.unsafe(
            `INSERT INTO ${SCHEMA}.companies (${COLS.join(",")}) VALUES (${marcas}) ON CONFLICT (id) DO NOTHING`,
            v,
          );
        }
      });
    }
    gravadas += registros.length;
    process.stdout.write(`\r${segmento} / ${sub}: ${registros.length} empresas gravadas`.padEnd(70));
  }

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM ${sql(SCHEMA)}.companies WHERE id LIKE 'rf-%'`;
  const [{ tamanho }] = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS tamanho`;
  console.log(`\n\nEmpresas reais no banco: ${Number(n).toLocaleString("pt-BR")}`);
  console.log(`Tamanho do banco: ${tamanho} (limite gratuito do Neon: 512 MB)`);
  await sql.end({ timeout: 10 });
}

async function limparDemo() {
  const sql = conectar();
  const [{ n }] = await sql`
    SELECT COUNT(*)::int AS n FROM ${sql(SCHEMA)}.companies c
    WHERE c.id NOT LIKE 'rf-%' AND NOT EXISTS (SELECT 1 FROM ${sql(SCHEMA)}.leads l WHERE l.company_id = c.id)
  `;
  await sql`
    DELETE FROM ${sql(SCHEMA)}.companies c
    WHERE c.id NOT LIKE 'rf-%' AND NOT EXISTS (SELECT 1 FROM ${sql(SCHEMA)}.leads l WHERE l.company_id = c.id)
  `;
  console.log(`${n} empresas de demonstração removidas (as que viraram lead foram preservadas).`);
  await sql.end({ timeout: 5 });
}

const cmd = process.argv[2];
const arg = Number(process.argv[3] ?? 0);
const acoes = { prever, importar: () => importar(arg || 60_000), completar: () => completar(arg || 90_000), "limpar-demo": limparDemo };

if (!acoes[cmd]) {
  console.log("uso: node scripts/importar.mjs [prever|importar N|completar N|limpar-demo]");
  process.exit(1);
}
acoes[cmd]().catch((e) => {
  console.error("\nERRO:", e.message);
  process.exit(1);
});
