import postgres from "postgres";

// ---------------------------------------------------------------------------
// Persistência em Postgres (Neon).
//
// O LINKFIVE divide o projeto Neon com o Prospecta. O isolamento vem do
// schema: `DB_SCHEMA=linkfive` faz toda tabela nascer em `linkfive.*`, sem
// nenhuma chance de colidir com `prospecta.*` nem com o `public`.
//
// Não usamos `search_path` porque o pooler em modo transação reaproveita
// conexões entre clientes — em vez disso, qualificamos os nomes das tabelas na
// própria query, em `qualify()`.
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

const SCHEMA = (() => {
  const raw = process.env.DB_SCHEMA?.trim();
  if (!raw || raw === "public") return "public";
  if (!/^[a-z_][a-z0-9_]*$/.test(raw)) {
    throw new Error(`DB_SCHEMA inválido: "${raw}". Use só letras minúsculas, números e underline.`);
  }
  return raw;
})();

/** Tabelas do LINKFIVE — a lista que o qualificador conhece. */
const TABLES = [
  "users",
  "pages",
  "links",
  "page_views",
  "link_clicks",
  "daily_stats",
  "leads",
  "plans",
  "subscriptions",
  "teams",
  "team_members",
  "settings",
  "short_links",
  "short_clicks",
] as const;

/**
 * Prefixa as tabelas com o schema configurado.
 *
 * As bordas `\b` importam mais do que parecem: sem elas, `links` casaria
 * dentro de `link_clicks` e `pages` dentro de `page_views`, gerando SQL
 * quebrado como `linkfive.link_clicks` virando `linkfive.linkfive.link_clicks`.
 * A ordem da lista não importa justamente por causa das bordas.
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
  var __linkfiveSql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __linkfiveSchema: Promise<void> | undefined;
}

/**
 * Limpa parâmetros que só o libpq entende. O Neon entrega a string com
 * `channel_binding=require`; o driver não implementa isso e o Postgres
 * recusaria a conexão. O TLS continua garantido pela opção `ssl` abaixo.
 */
function sanitizeUrl(raw: string): string {
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
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

function connect() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Copie .env.example para .env.local e cole a connection string do Neon.",
    );
  }
  return postgres(sanitizeUrl(connectionString), {
    // Pooler em modo transação: sem prepared statements.
    prepare: false,
    max: Number(process.env.LINKFIVE_DB_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: "require",
    // O `CREATE TABLE IF NOT EXISTS` do ensureSchema emite um NOTICE por tabela
    // a cada boot. É esperado e só enche o terminal de ruído.
    onnotice: () => {},
  });
}

/** Cliente único por processo (o Next recarrega módulos em dev). */
export function getSql() {
  if (!globalThis.__linkfiveSql) globalThis.__linkfiveSql = connect();
  return globalThis.__linkfiveSql;
}

// ---------------------------------------------------------------------------
// Schema
//
// Tudo com IF NOT EXISTS: a aplicação cria o banco sozinha no primeiro acesso.
// Num SaaS que ainda não tem pipeline de migração, isso vale mais que a pureza
// — evita o clássico "esqueci de rodar a migração" em produção.
// ---------------------------------------------------------------------------

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  plan TEXT NOT NULL DEFAULT 'free',
  reset_token TEXT,
  reset_expires TEXT,
  onboarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_reset ON users(reset_token);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  bio TEXT,
  avatar_url TEXT,
  theme_id TEXT NOT NULL DEFAULT 'clean',
  theme_overrides TEXT NOT NULL DEFAULT '{}',
  published INTEGER NOT NULL DEFAULT 0,
  suspended INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'link',
  title TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  icon TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_links_page ON links(page_id, position);

CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  device TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_views_page_date ON page_views(page_id, created_at);

CREATE TABLE IF NOT EXISTS link_clicks (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  device TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clicks_page_date ON link_clicks(page_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_link ON link_clicks(link_id);

-- Rollup diário: uma linha por página por dia, nunca apagada. É daqui que saem
-- os gráficos de 30 e 90 dias sem varrer a tabela de eventos crus.
CREATE TABLE IF NOT EXISTS daily_stats (
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  -- ATENÇÃO: chama-se leads_count, e não leads, de propósito.
  -- O qualify() acima é textual: ele não sabe distinguir o nome de uma tabela
  -- do nome de uma coluna igual. Uma coluna chamada "leads" viraria
  -- "linkfive.leads" no meio do DDL e de todo INSERT — erro de sintaxe.
  -- Nenhuma coluna deste schema pode ter o nome de uma tabela da lista TABLES.
  leads_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (page_id, day)
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  link_id TEXT,
  name TEXT,
  whatsapp TEXT,
  email TEXT,
  company TEXT,
  message TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_page ON leads(page_id, created_at);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  max_links INTEGER,
  max_pages INTEGER NOT NULL DEFAULT 1,
  features TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TEXT,
  gateway TEXT,
  gateway_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (user_id, key)
);

-- Links curtos diretos: linkfive.com.br/w/abc123 redireciona na hora para a
-- conversa do WhatsApp, sem abrir página nenhuma. É o formato do w.app, e
-- convive com a página de links — são usos diferentes do mesmo produto.
--
-- Não referencia a tabela pages: o link curto é independente da página. Quem só
-- quer o link do WhatsApp não precisa montar página nenhuma.
CREATE TABLE IF NOT EXISTS short_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  -- tipo: whatsapp (monta o wa.me a partir do numero) ou url (encurta o que
  -- o usuario colou, seja qual for o destino).
  tipo TEXT NOT NULL DEFAULT 'whatsapp',
  title TEXT NOT NULL DEFAULT '',
  numero TEXT,
  mensagem TEXT,
  destino TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  -- Total desnormalizado, só para a listagem não varrer short_clicks a cada
  -- carregamento. É incrementado na mesma instrução do INSERT do clique, então
  -- não dessincroniza. Nenhuma regra de cota depende dele.
  clicks_total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_short_user ON short_links(user_id, created_at);
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'whatsapp';
ALTER TABLE short_links ALTER COLUMN numero DROP NOT NULL;

CREATE TABLE IF NOT EXISTS short_clicks (
  id TEXT PRIMARY KEY,
  short_id TEXT NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
  device TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_short_clicks ON short_clicks(short_id, created_at);
`;

/** Cria o schema se ainda não existir. Memoizado por processo. */
export function ensureSchema(): Promise<void> {
  if (!globalThis.__linkfiveSchema) {
    const ddl =
      (SCHEMA === "public" ? "" : `CREATE SCHEMA IF NOT EXISTS ${SCHEMA};\n`) + qualify(SCHEMA_SQL);
    globalThis.__linkfiveSchema = getSql()
      .unsafe(ddl)
      .then(() => undefined)
      .catch((e) => {
        // Não memoize a falha: a próxima requisição deve tentar de novo.
        globalThis.__linkfiveSchema = undefined;
        throw e;
      });
  }
  return globalThis.__linkfiveSchema;
}

/**
 * Executa SQL com placeholders `?`, convertidos para a numeração do Postgres.
 * Mantém as queries do repositório legíveis.
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

/** Dia no formato YYYY-MM-DD, fuso de São Paulo — o do usuário, não o do servidor. */
export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
