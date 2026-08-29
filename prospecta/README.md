# Prospecta

SaaS de prospecção B2B que encontra empresas por segmento e localização e —
esse é o diferencial — **diz quem provavelmente decide a compra dentro delas**,
com a evidência pública que sustenta cada nome.

MVP focado em **Food Service**, com arquitetura multi-segmento desde o primeiro
commit (um segundo segmento, Saúde, já roda nas mesmas telas como prova).

---

## Rodando

O banco é **Postgres no Supabase** — o mesmo em desenvolvimento e em produção.

**1. Crie o projeto no Supabase** (supabase.com → New project). Guarde a senha
do banco; escolha a região São Paulo se o público for Brasil.

**2. Pegue a connection string:** botão **Connect** → aba **Transaction pooler**
(porta **6543**). Em serverless é obrigatório usar o pooler — a conexão direta
na 5432 estoura o limite de conexões do Postgres.

**3. Configure o ambiente:**

```bash
cp .env.example .env.local     # cole a DATABASE_URL e invente um SEED_TOKEN
npm install
npm run dev                    # http://localhost:3000
```

**4. Carregue a base de demonstração** (com o dev rodando, noutro terminal):

```bash
npm run seed          # POST /api/seed — 380 empresas, idempotente
npm run db:status     # confere o que existe no banco
```

O schema é criado sozinho no primeiro acesso (`ensureSchema` em `db.ts`).

**Dividindo o banco com outro projeto?** Defina `DB_SCHEMA=prospecta` no
`.env.local`. Todas as tabelas passam a viver nesse schema, isoladas do que já
existe no `public` — nomes de tabela são qualificados na query (o pooler em
modo transação reaproveita conexões, então `search_path` não serviria).

Requisitos: Node 20+. Sem dependências nativas.

## Deploy na Vercel

1. Suba o repositório e importe o projeto na Vercel (root = `prospecta/`).
2. Em **Settings → Environment Variables**, adicione `DATABASE_URL` e
   `SEED_TOKEN` (os mesmos valores do `.env.local`).
3. Deploy. Depois, carregue a base uma vez:

```bash
curl -X POST https://SEU-APP.vercel.app/api/seed -H "x-seed-token: SEU_TOKEN"
```

`GET /api/seed` mostra o estado do banco (contagem de empresas, leads, listas)
e serve de health check.

> **Antes de expor o link:** o app ainda não tem login — quem tiver a URL vê e
> altera tudo. Ok para demo acompanhada, não para usuário externo.

---

## O que tem

| Tela | Rota | O que faz |
|---|---|---|
| Busca | `/buscar` | Filtro por segmento, subsegmento, cidade, bairro, raio (km), score mínimo, porte, canais de contato. Lista e mapa. |
| Ficha da empresa | `/empresa/[id]` | Decisores com evidência, breakdown do Lead Score, dados públicos, procedência, mapa, unidades da mesma marca, histórico. |
| Meus leads | `/leads` | Tabela dos leads salvos, filtro por etapa, export CSV. |
| Listas | `/listas`, `/listas/[id]` | Recortes de prospecção por praça/campanha. |
| CRM | `/crm` | Kanban com Novo → Contatado → Interessado → Cotação → Negociação → Cliente, arrastar-e-soltar. |
| Dashboard | `/dashboard` | Funil, pipeline, conversão, % com decisor identificado, praças, atividade. |

Exportação: `GET /api/export?segment=food-service` (CSV `;` + BOM, abre direto
no Excel em português). Aceita `listId` e `stage`.

---

## Identificação de decisores

`src/lib/decisores.ts` — três camadas, da mais forte para a mais fraca, e cada
resultado carrega `evidence`, `source` e `confidence` (nada é afirmado sem
lastro):

1. **Quadro societário público (Receita Federal / QSA)** — sócios e
   administradores com nome, data de entrada e participação. Numa operação com
   menos de ~25 funcionários, o sócio-administrador é tratado como quem compra
   de fato ("compra direto").
2. **LinkedIn e menções públicas na web** — perfis públicos que expõem cargo +
   nome vinculados à empresa (Compras, Suprimentos, A&B, Operações), além de
   site institucional e imprensa. Quando a mesma pessoa aparece no QSA e no
   LinkedIn, as fontes se somam e a confiança sobe.
3. **Inferência por porte** — quando não há nome público, o Prospecta diz qual
   cargo procurar e como abordar, calibrado pelo tamanho da operação. Não
   sugere "Gerente de Compras" para uma pizzaria de 6 funcionários.

Onde falta o perfil, cada decisor traz um link de **busca X-Ray** pronta
(`site:linkedin.com/in "Nome" "Empresa"`) e a busca de pessoas do LinkedIn
filtrada pela empresa.

**Conformidade:** o produto trabalha apenas com dado público e não faz scraping
autenticado do LinkedIn (proibido pelos termos da plataforma). O fluxo previsto
é busca pública com confirmação humana antes de gravar o contato.

---

## Lead Score

`src/lib/scoring.ts` roda os fatores declarados pelo segmento e normaliza para
0-100, então os números continuam comparáveis quando um mercado novo entra com
outros fatores. Classes: **A** ≥75, **B** ≥55, **C** ≥35, **D** abaixo.

No Food Service: porte e capital (18), movimento estimado por avaliações
públicas (18), fit do subsegmento (14), maturidade (10), decisor identificado
(20), canais de contato (12), expansão e saúde cadastral (8). A ficha da
empresa mostra o cálculo fator a fator — o score nunca é uma caixa-preta.

---

## Arquitetura multi-segmento

Um segmento é **configuração**, não código de tela:

```
src/lib/segments/
  types.ts          contrato do SegmentConfig
  food-service.ts   11 subsegmentos, cargos decisores, 7 fatores de score
  saude.ts          segundo mercado, mesmas telas
  index.ts          registro — adicione o novo mercado aqui
```

Para atender Construção, Indústria ou Varejo: crie `construcao.ts` declarando
subsegmentos (com CNAEs), `decisionRoles` (quem decide e a partir de que porte),
`scoreFactors` e `estimateValue`, registre em `index.ts`. Nenhuma tela, rota ou
tabela muda.

---

## Estrutura

```
src/
  app/                telas (App Router, Server Components) + rotas de API
  components/         UI: filtros, cartão de empresa, mapa, kanban, controles
  lib/
    types.ts          domínio (nada específico de Food Service)
    segments/         configuração por mercado
    decisores.ts      motor de identificação de decisores
    scoring.ts        Lead Score
    repo.ts           consultas, CRM, listas, métricas
    db.ts             Postgres/Supabase (postgres.js) + schema + helper q()
    seed.ts           base de demonstração determinística
    providers.ts      contrato dos conectores de dados públicos
    filters.ts        a URL é o estado da busca
```

## Próximos passos para produção

- Trocar a base semeada pelos conectores reais em `providers.ts`
  (CNPJ/QSA, OpenStreetMap/Overpass, avaliações de mapa).
- Autenticação e multi-tenant (hoje é um workspace único, sem login).
- Confirmação humana de contatos (`contacts_confirmed` já existe no schema).
- Row Level Security no Supabase quando entrar multi-tenant.
