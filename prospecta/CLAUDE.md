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
- `companies.owner_user_id`: NULL = base pública (Receita); preenchido = empresa
  cadastrada à mão/importada, visível **só** para o dono. Toda query nova em
  `companies` precisa filtrar `(owner_user_id IS NULL OR owner_user_id = ?)` —
  ou `owner_user_id IS NULL` em agregados da base (cidades, contagens).
- Importação (`src/lib/importacao.ts`) só liga uma linha a uma empresa da base
  por CNPJ idêntico ou telefone idêntico + nome parecido. Telefone sozinho não
  basta: o da Receita costuma ser o do contador.
- Distância só é calculada com cidade escolhida (ou ponto explícito). Sem
  cidade não há centro que faça sentido.
- A busca ordena/filtra/pagina no Postgres usando o score gravado em
  `companies.rank_score/rank_tier/rank_has_dm`. Mudou regra de score, fator de
  segmento ou motor de decisores? Suba `SCORE_VERSION` (scoring.ts) e rode
  `POST /api/admin/scores` (header `x-seed-token`) até `pendentes: 0`. Depois
  de importar a base da Receita, idem. Nunca voltar a carregar o segmento
  inteiro na memória para ordenar.
- LGPD: toda exibição de decisor passa por `enrich()`, que aplica
  `aplicarSupressoes()`. Pedido de `/privacidade/remover` NÃO vale sozinho (o
  formulário é público, sem prova de identidade): só depois que um admin
  (`ADMIN_EMAILS`) aprova em `/admin/privacidade`.
  Função nova que monte decisores precisa chamar `await carregarSupressoes()`
  antes. Pedidos ficam em `privacy_requests` (prazo de resposta: 15 dias) —
  tela `/admin/privacidade` ou `GET /api/admin/privacidade` com `x-seed-token`.
- Dados do controlador (razão social, CNPJ, e-mail do encarregado) ficam em
  `src/lib/legal.ts` e aparecem na Política de Privacidade pública.
- Login tem limite de tentativas (`src/lib/limite.ts`, tabela `auth_attempts`):
  5 erros por e-mail ou 30 por IP em 15 min. Cadastro: 5 por IP por hora.

## Testar local

```bash
cp .env.example .env.local   # DATABASE_URL do Supabase (pooler 6543) + SEED_TOKEN
npm install
npm run dev                  # http://localhost:3000
npm run seed                 # carrega as 380 empresas de demonstração
npm run db:status            # estado do banco
```

Postgres local sem TLS (só desenvolvimento/teste): `PROSPECTA_DB_SSL=disable`.

O schema se cria sozinho no primeiro acesso (`ensureSchema`). Passo detalhado
no `README.md`.

## Dados

A base vem dos Dados Abertos do CNPJ da Receita Federal. **Não usar BigQuery**:
a franquia gratuita do projeto foi consumida e conta a partir da criação do
projeto, não do mês do calendário.

O caminho atual é `scripts/receita.mjs`, que baixa os ZIPs da Receita e lê em
streaming, sem descompactar nada em disco:

```bash
node --max-old-space-size=6144 scripts/receita.mjs                              # tudo
node --max-old-space-size=6144 scripts/receita.mjs utensilios                   # um segmento
node --max-old-space-size=6144 scripts/receita.mjs utensilios,locacao-festas    # segmentos/subsegmentos
```

Depois de qualquer carga, calcular o score das empresas novas:
`POST /api/admin/scores` (header `x-seed-token`) até `pendentes: 0` — sem isso
elas aparecem no fim da busca até a autocura alcançar.

CNAE amplo (ex.: 7729-2, aluguel de móveis) precisa de `exigeNome` em
`refinos.mjs`. Sem nome fantasia, o script confere a razão social.

Duas armadilhas já pagas, para não repetir:
- Nunca pendurar `on("data")` num stream que também é `pipe`ado: isso liga o
  modo flowing, mata o controle de fluxo e o download enche a memória.
- CNAE não é subsegmento. Restaurante, pizzaria e churrascaria dividem o
  5611-2/01 — quem separa é `scripts/classificador.mjs`, pelo nome.

## Deploy

Vercel + Neon (não Supabase). Variáveis na Vercel: `DATABASE_URL`, `DB_SCHEMA`,
`AUTH_SECRET`, `SEED_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e
`ADMIN_EMAILS` (e-mails de admin, separados por vírgula).
Endereço: prospecta-two-beta.vercel.app

O seed de demonstração só serve para banco vazio — a base real vem do script
da Receita:

```bash
curl -X POST https://SEU-APP.vercel.app/api/seed -H "x-seed-token: SEU_TOKEN"
```

Antes de qualquer usuário externo: autenticação e multi-tenant (hoje é
workspace único, sem login) e RLS no Supabase.
