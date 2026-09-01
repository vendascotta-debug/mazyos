import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable, Transform } from "node:stream";
import postgres from "postgres";
import unzipper from "unzipper";
import { mapaCnae, QUALIFICACAO, PORTE, UF } from "./importar-cnpj.mjs";
import { ignorado, REFINOS } from "./refinos.mjs";
import { classificarPorNome } from "./classificador.mjs";

// ---------------------------------------------------------------------------
// Carga direto dos Dados Abertos da Receita Federal — sem BigQuery, sem cota.
//
//   node scripts/receita.mjs               carga completa
//   node scripts/receita.mjs utensilios    só um segmento
//
// Baixa os ZIPs e lê em streaming: nada de descompactar 100 GB no disco. Filtra
// São Paulo nos CNAEs dos segmentos e grava no Postgres. Pode rodar quantas
// vezes precisar — a inserção é idempotente.
// ---------------------------------------------------------------------------

const ESPELHO = "https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos/2026-08-09";
const PARTES = 10;
const TETO_POR_CNAE = 25_000;

// --- utilidades ------------------------------------------------------------

const env = (nome) => {
  const l = fs
    .readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/)
    .find((x) => x.trim().startsWith(nome + "="));
  return l ? l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
};

const SCHEMA = env("DB_SCHEMA") || "public";

const conectar = () => {
  const u = new URL(env("DATABASE_URL"));
  u.searchParams.delete("channel_binding");
  return postgres(u.toString(), { prepare: false, ssl: "require", max: 4, onnotice: () => {} });
};

const soDigitos = (s) => (s ?? "").replace(/\D/g, "");

const titulo = (s) =>
  (s ?? "")
    .toLowerCase()
    .replace(/\b[a-zà-ú]/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase())
    .trim();

const semAcento = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** Linha do CSV da Receita: campos entre aspas, separados por ponto e vírgula. */
const campos = (linha) => linha.split(";").map((c) => c.replace(/^"|"$/g, ""));

/**
 * Percorre um ZIP remoto linha a linha, sem gravar nada em disco.
 * Os arquivos vêm em latin-1, que é o padrão da Receita.
 */
async function lerZip(url, aoLer) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} respondeu ${res.status}`);

  const total = Number(res.headers.get("content-length") ?? 0);
  let baixado = 0;
  let marco = 0;

  // O progresso passa por um Transform, não por um listener de "data":
  // pendurar "data" joga o stream em modo flowing, o controle de fluxo se perde
  // e o download enche a memória mais rápido do que o filtro consome. Foi assim
  // que a primeira tentativa morreu sem memória na sétima parte.
  const contador = new Transform({
    transform(pedaco, _enc, pronto) {
      baixado += pedaco.length;
      if (baixado - marco > 50 * 1048576) {
        marco = baixado;
        process.stdout.write(`     ${(baixado / 1048576).toFixed(0)}/${(total / 1048576).toFixed(0)} MB\n`);
      }
      pronto(null, pedaco);
    },
  });

  await Readable.fromWeb(res.body)
    .pipe(contador)
    .pipe(unzipper.Parse())
    .on("entry", async (entrada) => {
      const rl = readline.createInterface({ input: entrada.setEncoding("latin1"), crlfDelay: Infinity });
      for await (const linha of rl) if (linha) aoLer(linha);
    })
    .promise();

  process.stdout.write("\n");
}

// --- passos ----------------------------------------------------------------

async function alvos(apenasSegmento) {
  const mapa = await mapaCnae();
  const cnaes = new Map();
  for (const [cnae, alvo] of mapa) {
    if (ignorado(alvo.subsegmento)) continue;
    if (apenasSegmento && alvo.segmento !== apenasSegmento) continue;
    cnaes.set(cnae, alvo);
  }
  return cnaes;
}

/** Termos exigidos no nome para os CNAEs amplos demais (ver refinos.mjs). */
function exigencias(cnaes) {
  const porCnae = new Map();
  for (const [cnae, alvo] of cnaes) {
    const r = REFINOS[alvo.subsegmento];
    if (r?.exigeNome) porCnae.set(cnae, r.exigeNome.map(semAcento));
  }
  return porCnae;
}

async function baixarEstabelecimentos(cnaes, exige) {
  const escolhidos = [];
  const basicos = new Set();

  for (let i = 0; i < PARTES; i++) {
    console.log(`  Estabelecimentos ${i + 1}/${PARTES}`);
    await lerZip(`${ESPELHO}/Estabelecimentos${i}.zip`, (linha) => {
      // Filtro barato antes de partir a linha: a maioria morre aqui.
      if (!linha.includes(`;"${UF}";`)) return;
      const c = campos(linha);
      if (c[19] !== UF || c[5] !== "02") return;

      const cnae = c[11];
      if (!cnaes.has(cnae)) return;

      const termos = exige.get(cnae);
      if (termos && !termos.some((t) => semAcento(c[4]).includes(t))) return;

      escolhidos.push({
        basico: c[0], ordem: c[1], dv: c[2], fantasia: c[4],
        abertura: c[10], cnae,
        tipoLogradouro: c[13], logradouro: c[14], numero: c[15],
        bairro: c[17], cep: c[18], municipio: c[20],
        ddd: c[21], fone: c[22], email: c[27],
      });
      basicos.add(c[0]);
    });
    console.log(`     acumulado: ${escolhidos.length.toLocaleString("pt-BR")}`);
  }
  return { escolhidos, basicos };
}

async function baixarEmpresas(basicos) {
  const empresas = new Map();
  for (let i = 0; i < PARTES; i++) {
    console.log(`  Empresas ${i + 1}/${PARTES}`);
    await lerZip(`${ESPELHO}/Empresas${i}.zip`, (linha) => {
      const basico = linha.slice(1, linha.indexOf('";'));
      if (!basicos.has(basico)) return;
      const c = campos(linha);
      empresas.set(basico, { razao: c[1], capital: c[4], porte: c[5] });
    });
  }
  return empresas;
}

async function baixarSocios(basicos) {
  const socios = new Map();
  for (let i = 0; i < PARTES; i++) {
    console.log(`  Sócios ${i + 1}/${PARTES}`);
    await lerZip(`${ESPELHO}/Socios${i}.zip`, (linha) => {
      const basico = linha.slice(1, linha.indexOf('";'));
      if (!basicos.has(basico)) return;
      const lista = socios.get(basico) ?? [];
      if (lista.length >= 4) return; // quatro sócios bastam para achar o decisor
      const c = campos(linha);
      lista.push({
        nome: titulo(c[2]),
        qualificacao: QUALIFICACAO[c[4]] ?? `Qualificação ${c[4]}`,
        entrada: c[5]?.length === 8 ? `${c[5].slice(0, 4)}-${c[5].slice(4, 6)}-${c[5].slice(6, 8)}` : null,
        participacao: null,
      });
      socios.set(basico, lista);
    });
  }
  return socios;
}

async function nomesDeMunicipio() {
  const nomes = new Map();
  await lerZip(`${ESPELHO}/Municipios.zip`, (linha) => {
    const c = campos(linha);
    if (c[0]) nomes.set(c[0], titulo(c[1]));
  });
  return nomes;
}

/**
 * Coordenadas por cidade, reaproveitadas do que já está no banco (as 629
 * cidades da primeira carga). A Receita publica endereço, não coordenada.
 */
async function coordenadasConhecidas(db) {
  const linhas = await db`
    SELECT city, AVG(lat)::float8 AS lat, AVG(lng)::float8 AS lng
    FROM ${db(SCHEMA)}.companies WHERE city IS NOT NULL GROUP BY city
  `;
  return new Map(linhas.map((l) => [semAcento(l.city), { lat: l.lat, lng: l.lng, nome: l.city }]));
}

function estimarFuncionarios(porte, capital) {
  const c = Number(String(capital ?? "0").replace(",", ".")) || 0;
  const p = String(porte ?? "").replace(/^0/, "");
  if (p === "5") return c >= 5_000_000 ? 180 : c >= 1_000_000 ? 90 : 55;
  if (p === "3") return c >= 500_000 ? 40 : 25;
  return c >= 100_000 ? 12 : c >= 20_000 ? 6 : 3;
}

function coordenada(base, cnpj) {
  let h = 0;
  for (const ch of cnpj) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    lat: base.lat + (((h >> 10) % 1000) / 1000 - 0.5) * 0.06,
    lng: base.lng + ((h % 1000) / 1000 - 0.5) * 0.06,
  };
}

function montarRegistro(e, emp, qsa, municipios, coords, alvo, agora) {
  const cnpj = `${e.basico}${e.ordem}${e.dv}`;
  if (cnpj.length !== 14) return null;

  const razao = titulo(emp?.razao ?? "");
  const fantasia = titulo(e.fantasia ?? "");
  const nome = fantasia || razao;
  if (!nome) return null;

  const cidade = municipios.get(e.municipio);
  const base = cidade ? coords.get(semAcento(cidade)) : null;
  if (!base) return null; // sem coordenada da cidade, o mapa quebraria

  const funcionarios = estimarFuncionarios(emp?.porte, emp?.capital);
  const c = coordenada(base, cnpj);
  const sub = classificarPorNome(e.cnae, `${nome} ${razao}`) ?? alvo.subsegmento;
  const fone =
    e.ddd && e.fone
      ? e.fone.length >= 9
        ? `(${e.ddd}) ${e.fone.slice(0, 5)}-${e.fone.slice(5, 9)}`
        : `(${e.ddd}) ${e.fone.slice(0, 4)}-${e.fone.slice(4, 8)}`
      : null;

  return {
    id: `rf-${cnpj}`,
    segment_slug: alvo.segmento,
    subsegment_slug: sub,
    name: nome,
    legal_name: razao || nome,
    cnpj: `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`,
    street: [titulo(e.tipoLogradouro), titulo(e.logradouro)].filter(Boolean).join(" ") || null,
    number: e.numero || null,
    neighborhood: titulo(e.bairro) || null,
    city: base.nome,
    uf: UF,
    zip: soDigitos(e.cep).slice(0, 8) || null,
    lat: c.lat,
    lng: c.lng,
    phone: fone,
    whatsapp: null,
    email: (e.email ?? "").toLowerCase().trim() || null,
    website: null,
    instagram: null,
    linkedin: null,
    rating: null,
    reviews_count: null,
    price_level: null,
    employees_range:
      funcionarios >= 100 ? "100+" : funcionarios >= 50 ? "50-99" : funcionarios >= 20 ? "20-49" : funcionarios >= 6 ? "6-19" : "1-5",
    units_count: 1,
    opened_at:
      e.abertura?.length === 8 ? `${e.abertura.slice(0, 4)}-${e.abertura.slice(4, 6)}-${e.abertura.slice(6, 8)}` : null,
    capital_social: Number(String(emp?.capital ?? "0").replace(",", ".")) || null,
    porte: PORTE[emp?.porte] ?? null,
    situacao: "ATIVA",
    cnae_principal: e.cnae,
    cnae_principal_desc: null,
    cnae_secundarios: "[]",
    delivery_apps: "[]",
    hours: null,
    sources: "[]",
    public_records: JSON.stringify({ qsa: qsa ?? [], mentions: [], employeesEstimate: funcionarios }),
    created_at: agora,
    updated_at: agora,
  };
}

// --- principal -------------------------------------------------------------

const apenasSegmento = process.argv[2] || null;
const inicio = Date.now();

console.log(`Carga direto da Receita Federal${apenasSegmento ? ` — segmento ${apenasSegmento}` : ""}\n`);

const cnaes = await alvos(apenasSegmento);
console.log(`${cnaes.size} CNAEs alvo\n`);

console.log("  Municípios");
const municipios = await nomesDeMunicipio();
console.log(`     ${municipios.size} municípios\n`);

const { escolhidos, basicos } = await baixarEstabelecimentos(cnaes, exigencias(cnaes));
console.log(`\n${escolhidos.length.toLocaleString("pt-BR")} estabelecimentos ativos de ${UF} nos CNAEs alvo\n`);

const empresas = await baixarEmpresas(basicos);
console.log(`\n${empresas.size.toLocaleString("pt-BR")} com razão social\n`);

const socios = await baixarSocios(basicos);
console.log(`\n${socios.size.toLocaleString("pt-BR")} com quadro societário\n`);

// Teto por CNAE, priorizando porte e capital — mesma regra da versão BigQuery.
const porCnae = new Map();
for (const e of escolhidos) {
  const lista = porCnae.get(e.cnae) ?? [];
  lista.push(e);
  porCnae.set(e.cnae, lista);
}
const ordemPorte = { "5": 0, "05": 0, "3": 1, "03": 1 };
const selecionados = [];
for (const [, lista] of porCnae) {
  lista.sort((a, b) => {
    const ea = empresas.get(a.basico);
    const eb = empresas.get(b.basico);
    const pa = ordemPorte[ea?.porte] ?? 2;
    const pb = ordemPorte[eb?.porte] ?? 2;
    if (pa !== pb) return pa - pb;
    return (Number(String(eb?.capital ?? "0").replace(",", ".")) || 0) - (Number(String(ea?.capital ?? "0").replace(",", ".")) || 0);
  });
  selecionados.push(...lista.slice(0, TETO_POR_CNAE));
}
console.log(`${selecionados.length.toLocaleString("pt-BR")} após teto de ${TETO_POR_CNAE.toLocaleString("pt-BR")} por CNAE\n`);

const db = conectar();
const coords = await coordenadasConhecidas(db);
console.log(`${coords.size} cidades com coordenada conhecida\n`);

const agora = new Date().toISOString();
const registros = selecionados
  .map((e) => montarRegistro(e, empresas.get(e.basico), socios.get(e.basico), municipios, coords, cnaes.get(e.cnae), agora))
  .filter(Boolean);

console.log(`Gravando ${registros.length.toLocaleString("pt-BR")} empresas...`);
const COLS = Object.keys(registros[0]);
for (let i = 0; i < registros.length; i += 500) {
  await db`INSERT INTO ${db(SCHEMA)}.companies ${db(registros.slice(i, i + 500), ...COLS)} ON CONFLICT (id) DO NOTHING`;
  if (i % 20_000 === 0) process.stdout.write(`\r   ${i.toLocaleString("pt-BR")}/${registros.length.toLocaleString("pt-BR")}`);
}

const [{ n }] = await db`SELECT COUNT(*)::int AS n FROM ${db(SCHEMA)}.companies`;
const [{ tamanho }] = await db`SELECT pg_size_pretty(pg_database_size(current_database())) AS tamanho`;
const dist = await db`SELECT segment_slug s, COUNT(*)::int n FROM ${db(SCHEMA)}.companies GROUP BY 1 ORDER BY n DESC`;

console.log(`\n\nBase: ${Number(n).toLocaleString("pt-BR")} empresas · ${tamanho}`);
for (const d of dist) console.log(`   ${String(d.n).padStart(7)}  ${d.s}`);
console.log(`\nTempo total: ${Math.round((Date.now() - inicio) / 60000)} min`);
await db.end({ timeout: 10 });
