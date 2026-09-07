# LINKFIVE — Arquitetura técnica

> Documento de decisão. Escrito em 07/09/2026, antes de qualquer código.
> Aprovado o plano, a implementação segue exatamente essa estrutura.
> A pasta se chama `linkfive`; o produto se chama LINKFIVE.

---

## 1. Stack

Mesma base do Prospecta, que já está em produção e funciona. Não é preguiça — é
reaproveitamento de código de autenticação, camada de banco e deploy que já
foram testados ponta a ponta.

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 | Server Components entregam a página pública em HTML puro — rápida no celular e indexável no Google |
| Linguagem | TypeScript | Contratos de dados explícitos, que é o que segura um SaaS crescendo |
| Estilo | Tailwind CSS v4 | Mesma config do Prospecta |
| Banco | Postgres no Neon, driver `postgres.js` | Já contratado, já conhecido, free |
| Auth | Própria: scrypt + cookie HMAC assinado | Código já existe em `prospecta/src/lib/auth.ts`, sem dependência externa nem custo |
| Ícones | `lucide-react` | Já usado no Prospecta |
| QR Code | `qrcode` (npm), gerando SVG no servidor | Sem serviço externo, sem custo, sem vazar URL de usuário pra terceiro |
| Gráficos | SVG próprio, sem biblioteca | Os gráficos pedidos são linha e barra simples; uma lib de chart custa ~100KB de bundle à toa |
| Deploy | Vercel, projeto separado, Root Directory `projetos/linkfive` | Mesmo repositório `mazyos`, deploy independente do Prospecta |

### Decisão de banco que economiza dinheiro

O `db.ts` do Prospecta já suporta a variável `DB_SCHEMA`. O LINKFIVE usa **o mesmo
projeto Neon**, no schema `linkfive`. Zero colisão com as tabelas do Prospecta,
zero projeto novo, zero custo. Se um dia o LINKFIVE crescer, migra pra projeto
próprio mudando uma variável de ambiente.

---

## 2. Estrutura de páginas (rotas)

```
/                          Landing page (pública)
/entrar                    Login
/cadastrar                 Cadastro
/recuperar                 Recuperação de senha
/recuperar/[token]         Definir senha nova
/onboarding                Wizard de 5 etapas (só logado, só na 1ª vez)

/app                       Dashboard principal      ─┐
/app/pagina                Editor da página          │
/app/links                 Gerenciador de links      │
/app/leads                 Leads capturados          ├─ área logada
/app/analytics             Analytics + filtros       │  (protegida por
/app/qrcode                QR Code                   │   middleware)
/app/aparencia             Temas e personalização    │
/app/planos                Planos e upgrade          │
/app/config                Configurações da conta   ─┘

/admin                     Painel do administrador  ─┐
/admin/usuarios            Lista de usuários         ├─ só role = admin
/admin/paginas             Lista de páginas         ─┘

/[slug]                    PÁGINA PÚBLICA do usuário
```

### O problema do `/[slug]` — e como resolvemos

Colocar a página pública na raiz (`linkfive.com.br/alessandro`) é o certo pro
produto, mas cria um risco real: se alguém registrar o slug `entrar`, sequestra
a tela de login.

**Solução:** lista de slugs reservados, validada no cadastro e em toda troca de
slug. Reservados: `app`, `admin`, `api`, `entrar`, `cadastrar`, `recuperar`,
`onboarding`, `sobre`, `precos`, `planos`, `termos`, `privacidade`, `ajuda`,
`suporte`, `blog`, `contato`, `login`, `signup`, `dashboard`, `www`, `assets`,
`_next`, `static`, `favicon.ico`, `robots.txt`, `sitemap.xml`.

Regra do slug: 3 a 30 caracteres, apenas `a-z 0-9 -`, não começa nem termina
com hífen, sem hífen duplo, minúsculo forçado. Checagem de disponibilidade em
tempo real durante o cadastro.

### API (Route Handlers)

```
POST   /api/auth/cadastro          POST   /api/links
POST   /api/auth/login             PATCH  /api/links/[id]
POST   /api/auth/sair              DELETE /api/links/[id]
POST   /api/auth/recuperar         POST   /api/links/ordenar
GET    /api/slug/disponivel

PATCH  /api/pagina                 POST   /api/leads       (público, do formulário)
POST   /api/pagina/publicar        GET    /api/leads       (logado)
                                   GET    /api/leads/export (CSV)

POST   /api/eventos                (público — view e clique, fire-and-forget)
GET    /api/analytics              (logado, com filtro de período)
GET    /api/qrcode                 (SVG/PNG do slug)
```

---

## 3. Banco de dados

Onze tabelas. As do MVP marcadas com ✅; as das fases seguintes já nascem
criadas onde não custa nada — é mais barato nascer com a coluna do que migrar
depois com usuário em produção.

```
users              ✅  id, email, password_hash, name, avatar_url,
                       role ('user' | 'admin'),
                       plan ('free' | 'starter' | 'pro' | 'business'),
                       reset_token, reset_expires, created_at

pages              ✅  id, user_id, slug (UNIQUE), title, bio, avatar_url,
                       theme_id, theme_overrides (JSON), published (bool),
                       seo_title, seo_description, created_at, updated_at
                       -- 1 página por usuário no MVP; a tabela já é 1:N para
                       -- o plano BUSINESS (múltiplas páginas) sem migração

links              ✅  id, page_id, type, title, url, icon, config (JSON),
                       position, active (bool), created_at
                       -- type: link | whatsapp | instagram | facebook | tiktok
                       --       | youtube | maps | phone | email | catalog
                       --       | product | service | form
                       -- config guarda o que é específico do tipo:
                       --   whatsapp → { numero, mensagem }
                       --   form     → { titulo, campos: [...] }
                       --   product  → { preco, imagem, descricao }

page_views         ✅  id, page_id, created_at, device, referrer, country
link_clicks        ✅  id, link_id, page_id, created_at, device, referrer
daily_stats        ✅  page_id, day, views, clicks, whatsapp_clicks, leads
                       -- rollup diário; ver seção 7

leads                  id, page_id, link_id, name, whatsapp, email,
                       company, message, source, created_at

plans                  id, name, price_cents, max_links, max_pages,
                       features (JSON)
subscriptions          id, user_id, plan_id, status, current_period_end,
                       gateway, gateway_id
                       -- vazia no MVP; existe pro dia do gateway

teams                  id, name, owner_id   +   team_members
settings               user_id, key, value
```

**Isolamento por usuário.** Sem RLS — a aplicação conecta com um único usuário
de banco, então RLS não protegeria nada aqui. A garantia vem de uma regra dura
na camada de repositório: **nenhuma query de dado privado sai sem `user_id` na
cláusula WHERE.** Todo acesso passa por `src/lib/repo.ts`, e as funções recebem
`userId` como primeiro argumento obrigatório. Nenhuma rota monta SQL na mão.

---

## 4. Fluxo de autenticação

```
CADASTRO
  Nome, e-mail, senha, slug
    → valida: e-mail único, senha ≥ 8 caracteres, slug livre e não reservado
    → hashPassword (scrypt + salt por usuário)
    → cria users + pages (rascunho, published = false)
    → cookie de sessão assinado (HMAC-SHA256, httpOnly, 30 dias)
    → redireciona pra /onboarding

LOGIN
  E-mail + senha → verifyPassword (timingSafeEqual) → cookie → /app

PROTEÇÃO DE ROTAS
  middleware.ts intercepta /app/* e /admin/*
    → sem cookie válido → /entrar
    → /admin/* exige role = admin
  O middleware roda no Edge: só lê e valida a assinatura do cookie, não toca o
  banco (o Edge não tem node:crypto completo — mesma restrição que o Prospecta
  já resolveu isolando a constante em session-cookie.ts)

RECUPERAÇÃO DE SENHA
  E-mail → token aleatório com validade de 1h gravado em users
    → link enviado por e-mail → /recuperar/[token] → senha nova
  ⚠️ Depende de um serviço de e-mail. Ver seção 11.
```

---

## 5. Fluxo de criação e publicação da página

```
ONBOARDING (5 etapas, com barra de progresso e opção de pular)
  1. Nome da página        → pages.title
  2. Foto ou logo          → pages.avatar_url
  3. Primeiros links       → links (sugestão inicial: WhatsApp)
  4. Personalizar          → escolha entre os 5 temas
  5. Publicar              → pages.published = true
  Final: "Sua página está pronta." + link público + QR Code + botão Visualizar

EDITOR (/app/pagina)
  Tela dividida: painel de edição à esquerda, preview em moldura de celular à
  direita, atualizando ao vivo (estado em React, sem recarregar).
  Salvamento explícito por botão — não automático, pra você não publicar no
  meio de uma edição.

  Reordenar links: arrastar e soltar (drag-and-drop nativo do HTML5, sem lib)
  → grava a nova ordem em lote via POST /api/links/ordenar.

PUBLICAÇÃO
  published = false → /[slug] responde 404 para todo mundo, inclusive o dono
  published = true  → página pública no ar
```

**Correção feita durante a implementação (07/09/2026).** O plano original dizia
que o dono logado veria o próprio rascunho na URL pública, com uma tarja. Isso
foi descartado: para saber quem é o visitante, a rota precisaria ler o cookie de
sessão, e ler cookie torna a rota dinâmica no Next — cada visita passaria a
custar uma ida ao banco, justamente na página que precisa ser a mais rápida do
sistema.

O rascunho é conferido no preview do editor (`/app/pagina`), que mostra a página
real dentro de uma moldura de celular. A URL pública fica cacheada, como
prometido na seção 6.

---

## 6. Estrutura de componentes

```
src/components/
  ui/            Botao, Card, Campo, Modal, Aba, Aviso, Selo
  landing/       Hero, ComoFunciona, Recursos, ParaQuem, Exemplos,
                 Analytics, Leads, QrCode, Planos, Faq, CtaFinal
  app/           Sidebar, Topbar, CardMetrica, GraficoLinha, GraficoBarra,
                 TabelaLeads, RankingLinks, FiltroPeriodo
  editor/        PainelPerfil, ListaLinks, ItemLink, ModalTipoLink,
                 FormWhatsapp, FormFormulario, PreviewCelular, SeletorTema
  publica/       Cabecalho, BotaoLink, GradeProdutos, FormularioLead, Rodape
```

A pasta `publica/` é a mais importante do produto e tem uma regra própria:
**nada de JavaScript pesado.** É o que o cliente do seu cliente abre no 4G.
Componentes de servidor, e um único script pequeno pro registro de clique.

---

## 7. Analytics — a decisão que evita conta alta

Registrar cada visualização e cada clique como linha crua é simples, mas uma
página com tráfego real gera dezenas de milhares de linhas por mês, e o free do
Neon tem limite de armazenamento.

**Arquitetura em duas camadas:**

1. **Eventos crus** (`page_views`, `link_clicks`) — detalhe fino dos últimos 90
   dias. Guardam dispositivo, referrer e horário.
2. **Rollup diário** (`daily_stats`) — uma linha por página por dia, nunca
   apagada. É daqui que saem os gráficos de 30 e 90 dias, em uma query só.

Uma rotina de limpeza (manual no começo, depois um cron da Vercel) apaga os
eventos crus com mais de 90 dias, já consolidados no rollup.

**Registro do evento.** A página pública é estática e cacheada — contar
visualização no render mataria o cache. Em vez disso, um `fetch` disparado no
carregamento chama `POST /api/eventos` sem esperar resposta. O clique em link
faz o mesmo antes de navegar, via `navigator.sendBeacon`, que sobrevive à saída
da página.

**Anti-inflação:** o próprio dono visitando a página não conta. Bots
identificados por user-agent não contam.

Filtros de Hoje / 7 / 30 / 90 dias, com comparativo contra o período anterior
("+18% vs. semana passada").

---

## 8. Estrutura de planos

Os limites vivem num único módulo, `src/lib/limites.ts` — **nunca espalhados
pelo código**. Toda ação que consome cota pergunta pra ele.

```
FREE      R$ 0        1 página,  5 links,  QR Code, analytics 7 dias,  marca LINKFIVE
STARTER   R$ 9,90     1 página, 25 links,  temas,   analytics 30 dias, marca LINKFIVE
PRO       R$ 19,90    1 página, links ilimitados, formulários + leads,
                      analytics 90 dias, personalização avançada, SEM marca
BUSINESS  R$ 39,90    5 páginas, tudo do PRO, equipe, analytics avançado
```

A checagem é **no servidor**, dentro da rota de API — esconder o botão no front
não é controle de acesso. O front usa o mesmo módulo apenas pra mostrar o
cadeado e o convite pro upgrade.

**Pagamento:** nenhum gateway agora, como você pediu. Mas a tabela
`subscriptions` já nasce com `gateway` e `gateway_id`, e o plano do usuário é
lido de lá (com fallback pra `users.plan`). No dia do Stripe ou do Mercado
Pago, o trabalho é escrever o webhook — nada do resto muda.

---

## 9. Identidade visual — própria, não cópia

O Linktree é verde-limão sobre roxo. O W.app é verde WhatsApp. Os dois gritam
"ferramenta de link". O LINKFIVE vai pro lado oposto: **cara de ferramenta
comercial**, porque o público é quem vende.

- **Primária:** violeta profundo `#5B3DF5` — confiança, sem ser azul corporativo
- **Acento:** âmbar `#FFB020` — só em CTA e no número que importa
- **Tinta:** `#12121A`, quase-preto, para texto
- **Fundos:** `#FFFFFF` e `#F7F7FB`
- **Tipografia:** Inter na interface + Instrument Serif nos títulos da landing —
  o serif é o que separa visualmente de todo concorrente
- **Formas:** raio 14px nos cards, 10px nos botões, sombra baixa e difusa
- **Proibido:** verde como cor principal, gradiente arco-íris, botão pill preto

Os 5 temas da página pública: **Clean** (branco), **Noturno** (escuro),
**Vitrine** (foco em produto), **Contato** (WhatsApp em destaque) e **Criador**
(visual, imagem grande).

---

## 10. Ordem de implementação do MVP

Cada item é testado ponta a ponta antes do próximo. Nada de tela morta.

```
 1. Projeto Next + Tailwind + conexão Neon (schema linkfive)   → base
 2. Schema do banco + camada repo com userId obrigatório     → base
 3. Cadastro, login, logout, middleware                      → testa: 2 contas isoladas
 4. Editor de página + CRUD de links + reordenar             → testa: cria e salva
 5. Página pública /[slug] responsiva                        → testa: no celular
 6. Gerador de link do WhatsApp                              → testa: abre a conversa
 7. Contadores de view e clique + dashboard com números      → testa: número sobe
 8. QR Code (ver, baixar)                                    → testa: escaneia
 9. Personalização básica (5 temas)                          → testa: troca de tema
10. Onboarding de 5 etapas                                   → testa: conta nova
11. Landing page completa                                    → testa: leitura mobile
```

Fase 2: formulários, leads, analytics avançado, produtos e serviços.
Fase 3: planos, assinaturas, pagamento, equipes.
Fase 4: recursos avançados, automação, integrações, API.

---

## 11. Pontos que dependem de você

Não travam o começo, mas travam o lançamento:

1. **Domínio.** `linkfive.com.br` está livre? O produto inteiro depende do domínio
   curto — se estiver ocupado, o nome muda antes de eu escrever a primeira
   linha de código.
2. **E-mail transacional.** A recuperação de senha precisa enviar e-mail. O
   Resend tem 3.000/mês grátis e é o mais simples. Até você definir, a
   recuperação fica como último item do MVP.
3. **LGPD.** Você vai guardar dados de terceiros (os leads dos seus clientes).
   Precisa de política de privacidade e termos de uso antes de aceitar cadastro
   real. Eu escrevo o texto, mas a decisão é sua.
4. **Upload de imagem.** Logo e foto de produto precisam de armazenamento. O
   Vercel Blob tem free tier e integra sem configuração. Alternativa de custo
   zero no MVP: aceitar URL de imagem colada.

---

## 12. Riscos reconhecidos

| Risco | Mitigação |
|---|---|
| Slug na raiz colidindo com rota do sistema | Lista de reservados, validada no cadastro e na troca |
| Volume de eventos estourando o free do Neon | Rollup diário + expurgo de 90 dias |
| Página pública lenta no 4G | Server Components, zero lib de UI, imagem otimizada |
| Vazamento de dados entre contas | `userId` obrigatório na assinatura de toda função do repo |
| Alguém hospedar phishing numa página LINKFIVE | Painel admin com listagem e botão de suspender página |
| Concorrência estabelecida (Linktree, W.app) | Diferencial é lead + WhatsApp + analytics comercial, não "lista de links" |
