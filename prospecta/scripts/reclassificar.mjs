import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { classificarPorNome } from "./classificador.mjs";

// ---------------------------------------------------------------------------
// Reclassifica as empresas já importadas usando o nome, sem tocar no BigQuery.
//
//   node scripts/reclassificar.mjs         -> mostra o que mudaria
//   node scripts/reclassificar.mjs aplicar -> grava
// ---------------------------------------------------------------------------

function env(nome) {
  const linha = fs
    .readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(nome + "="));
  return linha ? linha.slice(linha.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}

const SCHEMA = env("DB_SCHEMA") || "public";
const url = new URL(env("DATABASE_URL"));
url.searchParams.delete("channel_binding");
const sql = postgres(url.toString(), { prepare: false, ssl: "require", max: 4, onnotice: () => {} });

const aplicar = process.argv[2] === "aplicar";

const linhas = await sql`
  SELECT id, name, legal_name, cnae_principal, subsegment_slug
  FROM ${sql(SCHEMA)}.companies
  WHERE id LIKE 'rf-%' AND segment_slug = 'food-service'
`;

const mudancas = [];
for (const l of linhas) {
  // O nome fantasia manda; quando é uma pessoa física (MEI), a razão social
  // costuma ser o nome da pessoa e não ajuda — mas às vezes traz a atividade.
  const novo = classificarPorNome(l.cnae_principal, `${l.name} ${l.legal_name ?? ""}`);
  if (novo && novo !== l.subsegment_slug) mudancas.push({ id: l.id, de: l.subsegment_slug, para: novo });
}

const resumo = new Map();
for (const m of mudancas) {
  const k = `${m.de} -> ${m.para}`;
  resumo.set(k, (resumo.get(k) ?? 0) + 1);
}

console.log(`${linhas.length.toLocaleString("pt-BR")} empresas analisadas`);
console.log(`${mudancas.length.toLocaleString("pt-BR")} mudariam de subsegmento\n`);
for (const [k, v] of [...resumo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${String(v).padStart(6)}  ${k}`);
}

if (!aplicar) {
  console.log("\n(simulação — rode com 'aplicar' para gravar)");
  await sql.end({ timeout: 5 });
  process.exit(0);
}

// Agrupa por destino para atualizar em poucos comandos.
const porDestino = new Map();
for (const m of mudancas) {
  if (!porDestino.has(m.para)) porDestino.set(m.para, []);
  porDestino.get(m.para).push(m.id);
}

for (const [destino, ids] of porDestino) {
  for (let i = 0; i < ids.length; i += 1000) {
    const lote = ids.slice(i, i + 1000);
    await sql`
      UPDATE ${sql(SCHEMA)}.companies SET subsegment_slug = ${destino}, updated_at = ${new Date().toISOString()}
      WHERE id = ANY(${lote})
    `;
  }
  console.log(`  ${destino}: ${ids.length} atualizadas`);
}

const final = await sql`
  SELECT subsegment_slug s, COUNT(*)::int n FROM ${sql(SCHEMA)}.companies
  WHERE segment_slug = 'food-service' GROUP BY 1 ORDER BY n DESC
`;
console.log("\nDISTRIBUIÇÃO FINAL:");
for (const r of final) console.log(`  ${String(r.n).padStart(6)}  ${r.s}`);

await sql.end({ timeout: 10 });
