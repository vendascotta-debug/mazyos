# Prospecta — contexto do projeto

SaaS de prospecção B2B do Alessandro. Encontra empresas por segmento e
localização e identifica **quem provavelmente decide a compra** dentro delas.
MVP em Food Service; arquitetura multi-segmento desde o início.

Documentação de produto e arquitetura: `README.md` (nesta pasta).

## Regras deste projeto

- Stack: Next.js 15 (App Router) + TypeScript + Tailwind v4 + Postgres no
  Supabase via `postgres.js`. **Não** adicionar dependências nativas (o
  ambiente Windows bloqueia install scripts — foi o que descartou o
  `better-sqlite3`).
- Toda query passa pelo helper `q()`/`q1()` de `db.ts`, que aceita placeholders
  `?` e converte para `$n`. O schema mora em `SCHEMA_SQL` (db.ts) e é espelhado
  em `supabase/schema.sql` — mudou um, atualize o outro.
- Conexão sempre pelo **pooler em modo transação** (porta 6543) com
  `prepare: false`. Conexão direta na 5432 estoura o limite na Vercel.
- `DB_SCHEMA` isola as tabelas quando o banco é compartilhado. Tabela nova no
  schema? Acrescente o nome à lista `TABLES` de `db.ts`, senão ela não é
  qualificada e vai parar no `public`.
- Segmento novo = arquivo novo em `src/lib/segments/` + registro no `index.ts`.
  Nunca hardcodar regra de Food Service em tela, rota ou tabela.
- Todo decisor exibido carrega `evidence`, `source` e `confidence`. Nada de
  afirmar contato sem lastro em dado público.
- Sem scraping autenticado do LinkedIn (viola os termos). Só busca pública /
  X-Ray, com confirmação humana antes de gravar contato.
- Linhas do driver não são objetos puros: `q()` já normaliza com spread antes
  de qualquer coisa cruzar para Client Component.
- Agregados do Postgres voltam como string (`int8`, `numeric`): usar `::int` /
  `::float8` na query ou o helper `toNum()` de `repo.ts`.

## Testar local

```bash
cp .env.example .env.local   # DATABASE_URL do Supabase (pooler 6543) + SEED_TOKEN
npm install
npm run dev                  # http://localhost:3000
npm run seed                 # carrega as 380 empresas de demonstração
npm run db:status            # estado do banco
```

O schema se cria sozinho no primeiro acesso (`ensureSchema`). Passo detalhado
no `README.md`.

## Dados

A base vem dos Dados Abertos do CNPJ da Receita Federal. **Não usar BigQuery**:
a franquia gratuita do projeto foi consumida e conta a partir da criação do
projeto, não do mês do calendário.

O caminho atual é `scripts/receita.mjs`, que baixa os ZIPs da Receita e lê em
streaming, sem descompactar nada em disco:

```bash
node --max-old-space-size=6144 scripts/receita.mjs             # tudo
node --max-old-space-size=6144 scripts/receita.mjs utensilios  # um segmento
```

Duas armadilhas já pagas, para não repetir:
- Nunca pendurar `on("data")` num stream que também é `pipe`ado: isso liga o
  modo flowing, mata o controle de fluxo e o download enche a memória.
- CNAE não é subsegmento. Restaurante, pizzaria e churrascaria dividem o
  5611-2/01 — quem separa é `scripts/classificador.mjs`, pelo nome.

## Deploy

Vercel + Neon (não Supabase). Variáveis na Vercel: `DATABASE_URL`, `DB_SCHEMA`,
`AUTH_SECRET`, `SEED_TOKEN`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
Endereço: prospecta-two-beta.vercel.app

O seed de demonstração só serve para banco vazio — a base real vem do script
da Receita:

```bash
curl -X POST https://SEU-APP.vercel.app/api/seed -H "x-seed-token: SEU_TOKEN"
```

Antes de qualquer usuário externo: autenticação e multi-tenant (hoje é
workspace único, sem login) e RLS no Supabase.
