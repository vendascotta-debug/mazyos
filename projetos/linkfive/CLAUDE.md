# LINKFIVE

> Projeto criado em 07/09/2026. Pasta dedicada — instruções aqui sobrescrevem as da raiz quando relevantes.
> A pasta se chama `linkfive`. O produto se chama **LINKFIVE**. Não renomear a pasta.

## Sobre

SaaS de criação e gerenciamento de páginas de links. O usuário cria uma página
pública (`linkfive.com.br/nomedonegocio`) que concentra todos os seus canais
digitais — WhatsApp, redes sociais, site, mapa, catálogo, produtos, serviços,
formulários e links personalizados.

O diferencial não é "lista de links": é transformar a página numa **central de
contato e geração de clientes**, com captura de leads, analytics comercial e
WhatsApp em primeiro plano.

## Tipo

Projeto interno (SaaS próprio, para virar produto comercial)

## Público-alvo

- **Empresas:** restaurantes, lojas, oficinas, imobiliárias, revendas de
  veículos, prestadores de serviço, pequenos negócios
- **Profissionais:** corretores, vendedores, representantes, fotógrafos,
  consultores, profissionais liberais
- **Criadores e afiliados:** criadores de conteúdo, afiliados

## Referências (funcionalidade apenas, nunca visual)

Linktree e W.app servem como referência de **o que o produto faz**. A interface,
identidade visual e experiência são próprias. Não copiar o visual de nenhum dos
dois.

## Entregas previstas

- SaaS completo (landing page, auth, dashboard, editor, página pública, admin)

## Onde salvar o que

- `arquitetura.md` — documento técnico de referência. **Ler antes de implementar.**
- `briefing.md` — o pedido original e as pendências
- O app Next.js vive na raiz dessa pasta (`package.json`, `src/`, etc.),
  igual ao `prospecta/`

## Contexto que herda da raiz

Esse projeto herda o contexto do negócio de `_memoria/` da raiz. **Não herda a
identidade visual** — o LINKFIVE tem marca própria, definida na seção 9 do
`arquitetura.md`.

## Específico desse projeto

- **Stack:** Next.js 15 + React 19 + TypeScript + Tailwind v4 + Postgres (Neon)
- **Banco:** mesmo projeto Neon do Prospecta, schema `linkfive` (via `DB_SCHEMA`)
- **Auth:** própria (scrypt + cookie HMAC), padrão reaproveitado de
  `prospecta/src/lib/auth.ts`
- **Regra de segurança inegociável:** nenhuma função de repositório acessa dado
  privado sem receber `userId` como primeiro argumento
- **Página pública:** sem JavaScript pesado. É o que abre no 4G do cliente final
- **Paleta (desde 08/09/2026):** azul-marinho `#050a18` no fundo, azul elétrico
  `#1e6bff` na ação, ciano `#38bdf8` no acento. Antes era violeta; mudou a
  pedido, seguindo referência de agência
- **Cor proibida:** verde como cor principal (é a do Linktree e a do W.app)
- **Nunca inventar prova social:** nada de logo de cliente, depoimento ou
  número de usuários que não existam. A barra de números do hero traz fatos do
  produto, verificáveis abrindo o site
- **Antes de avançar de funcionalidade:** testar o fluxo completo da anterior.
  Nada de tela estática sem dado real persistido
