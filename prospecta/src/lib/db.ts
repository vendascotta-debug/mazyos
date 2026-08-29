import postgres from "postgres";

// ---------------------------------------------------------------------------
// Persistência em Postgres (Supabase).
//
// Conexão via `DATABASE_URL`. Em serverless (Vercel) use SEMPRE o pooler em
// modo transação do Supabase — porta 6543, host `...pooler.supabase.com` —
// senão cada invocação abre uma conexão nova e o Postgres esgota o limite.
// O pooler em modo transação não suporta prepared statements: daí `prepare:false`.
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

/**
 * Schema do Postgres onde o Prospecta vive. Default `public`.
 *
 * Existe para o caso de dividir o banco com outro projeto: apontando
 * `DB_SCHEMA=prospecta`, todas as tabelas ficam isoladas e nada colide com o
 * que já existe no `public`. Não usamos `search_path` porque o pooler em modo
 * transação reaproveita conexões entre clientes — em vez disso, qualificamos
 * os nomes das tabelas na própria query.
 */
const SCHEMA = (() => {
  const raw = process.env.DB_SCHEMA?.trim();
  if (!raw || raw === "public") return "public";
  if (!/^[a-z_][a-z0-9_]*$/.test(raw)) {
    throw new Error(`DB_SCHEMA inválido: "${raw}". Use só letras minúsculas, números e underline.`);
  }
  return raw;
})();

/** Tabelas do Prospecta — a lista que o qualificador conhece. */
const TABLES = [
  "users",
  "companies",
  "leads",
  "lead_lists",
  "lead_list_items",
  "activities",
  "contacts_confirmed",
] as const;

/**
 * Prefixa as tabelas do Prospecta com o schema configurado.
 * As bordas `\b` garantem que `companies` não case dentro de `company_id` nem
 * de `idx_companies_seg`, e que `leads` não case dentro de `lead_lists`.
 */
export function qualify(sql: string): string {
  if (SCHEMA === "public") return sql;
  let out = sql;
  for (const t of TABLES) {
    out = out.replace(new RegExp(`\\b${t}\\b`, "g"), `${SCHEMA}.${t}`);
  }
  return out;
}

export const dbSchema = () => SCHEMA;

declare global {
  // eslint-disable-next-line no-var
  var __prospectaSql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __prospectaSchema: Promise<void> | undefined;
}

/**
 * Limpa parâmetros da URL que só o libpq entende. O Neon, por exemplo, entrega
 * a string com `channel_binding=require`; o driver não implementa isso e o
 * Postgres recusaria a conexão por parâmetro desconhecido. O TLS continua
 * garantido pela opção `ssl` abaixo.
 */
function sanitizeUrl(raw: string): string {
  // Tolera o que costuma vir junto num copiar-e-colar: o nome da variável
  // repetido na frente, aspas sobrando, `psql ` na frente, espaços/quebras.
  let url = raw.trim();
  url = url.replace(/^psql\s+/i, "");
  url = url.replace(/^DATABASE_URL\s*=\s*/i, "");
  url = url.replace(/^["']|["']$/g, "").trim();

  if (url.includes("...")) {
    throw new Error(
      "A DATABASE_URL parece ser um exemplo, não a string real (contém '...'). " +
        "No Neon: Connect → Show password → Copy snippet, e cole no .env.local.",
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error(
      "A DATABASE_URL não parece uma conexão Postgres — ela precisa começar com postgresql://",
    );
  }

  try {
    const u = new URL(url);
    // `channel_binding` é do libpq; o driver não implementa e o servidor
    // recusaria como parâmetro desconhecido. O TLS segue pela opção `ssl`.
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

function connect() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Copie .env.example para .env.local e cole a connection string do Supabase (Connect → Transaction pooler).",
    );
  }
  return postgres(sanitizeUrl(connectionString), {
    // Pooler em modo transação: sem prepared statements.
    prepare: false,
    // Serverless: poucas conexões por instância, encerradas rápido.
    max: Number(process.env.PROSPECTA_DB_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: "require",
    // O `CREATE TABLE IF NOT EXISTS` do ensureSchema emite um NOTICE por
    // tabela a cada boot ("already exists, skipping"). É esperado e enche o
    // terminal de ruído — só deixamos passar erro de verdade.
    onnotice: () => {},
  });
}

/** Cliente único por processo (o Next recarrega módulos em dev). */
export function getSql() {
  if (!globalThis.__prospectaSql) globalThis.__prospectaSql = connect();
  return globalThis.__prospectaSql;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  segment_slug TEXT NOT NULL,
  subsegment_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  cnpj TEXT,
  street TEXT, number TEXT, neighborhood TEXT, city TEXT, uf TEXT, zip TEXT,
  lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
  phone TEXT, whatsapp TEXT, email TEXT, website TEXT, instagram TEXT, linkedin TEXT,
  rating DOUBLE PRECISION, reviews_count INTEGER, price_level INTEGER,
  employees_range TEXT, units_count INTEGER DEFAULT 1,
  opened_at TEXT, capital_social DOUBLE PRECISION, porte TEXT, situacao TEXT,
  cnae_principal TEXT, cnae_principal_desc TEXT,
  cnae_secundarios TEXT DEFAULT '[]',
  delivery_apps TEXT DEFAULT '[]',
  hours TEXT,
  sources TEXT DEFAULT '[]',
  public_records TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin TEXT;
CREATE INDEX IF NOT EXISTS idx_companies_seg ON companies(segment_slug, subsegment_slug);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city, neighborhood);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'novo',
  score INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'C',
  note TEXT,
  estimated_value DOUBLE PRECISION,
  owner_name TEXT,
  last_contact_at TEXT,
  next_action_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- Multiusuário: cada lead e cada lista pertencem a alguém.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE lead_lists ADD COLUMN IF NOT EXISTS user_id TEXT;
-- A restrição antiga era global e impedia dois usuários de salvarem a mesma
-- empresa. Agora a unicidade é por usuário.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_company_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_company ON leads(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_lists_user ON lead_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

CREATE TABLE IF NOT EXISTS lead_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  segment_slug TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_list_items (
  list_id TEXT NOT NULL REFERENCES lead_lists(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  PRIMARY KEY (list_id, lead_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id, created_at);

CREATE TABLE IF NOT EXISTS contacts_confirmed (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  decision_maker_id TEXT NOT NULL,
  name TEXT, role TEXT, phone TEXT, email TEXT, linkedin TEXT,
  confirmed_at TEXT NOT NULL
);
`;

/**
 * Cria o schema se ainda não existir. Memoizado por processo — o custo real
 * acontece uma vez por cold start, e evita o clássico "esqueci de rodar a
 * migração" num projeto que ainda não tem pipeline de migrations.
 */
export function ensureSchema(): Promise<void> {
  if (!globalThis.__prospectaSchema) {
    const ddl =
      (SCHEMA === "public" ? "" : `CREATE SCHEMA IF NOT EXISTS ${SCHEMA};\n`) + qualify(SCHEMA_SQL);
    globalThis.__prospectaSchema = getSql()
      .unsafe(ddl)
      .then(() => undefined)
      .catch((e) => {
        // Não memoize a falha: a próxima requisição deve tentar de novo.
        globalThis.__prospectaSchema = undefined;
        throw e;
      });
  }
  return globalThis.__prospectaSchema;
}

/**
 * Executa SQL com placeholders `?` (herdados do SQLite) convertidos para a
 * numeração do Postgres. Mantém as queries do repositório legíveis.
 */
export async function q<T = Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  await ensureSchema();
  let i = 0;
  const pgText = qualify(text).replace(/\?/g, () => `$${++i}`);
  const rows = await getSql().unsafe(pgText, params as never[]);
  // postgres.js devolve linhas com protótipo próprio; o React exige objeto puro.
  return rows.map((r) => ({ ...r })) as T[];
}

/** Mesma coisa, para quando só interessa a primeira linha. */
export async function q1<T = Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | undefined> {
  const rows = await q<T>(text, params);
  return rows[0];
}

export const nowIso = () => new Date().toISOString();

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
