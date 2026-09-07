# Briefing — LINKFIVE

**Data:** 07/09/2026
**Pasta:** `projetos/linkfive/` · **Produto:** LINKFIVE
**Tipo:** projeto interno (SaaS próprio)

## Objetivo

Plataforma de criação e gerenciamento de páginas de links, com identidade
própria e foco em empresas, profissionais, vendas e geração de leads.

Cada usuário tem uma página pública em `linkfive.com.br/nomedonegocio`
concentrando: WhatsApp, Instagram, Facebook, TikTok, YouTube, site, Google Maps,
telefone, e-mail, catálogo, produtos, serviços, formulários e links
personalizados.

## Posicionamento

Referência de funcionalidade: Linktree e W.app. **Não é cópia** — interface,
identidade visual e experiência são próprias.

O diferencial é a página como central de contato e geração de clientes:
captura de leads, analytics comercial, WhatsApp em destaque.

## Landing page — copy definida pelo cliente

- **Headline:** "Seu link. Sua marca. Seus clientes."
- **Subheadline:** "Crie uma página profissional com todos os seus canais,
  produtos e formas de contato em um único link."
- **CTA primário:** "CRIAR MINHA PÁGINA GRÁTIS"
- **CTA secundário:** "VER COMO FUNCIONA"
- **Visual do hero:** página LINKFIVE renderizada dentro de um smartphone
- **Seções:** Como funciona · Recursos · Para quem é · Exemplos de utilização ·
  Analytics · Captura de leads · QR Code · Planos · FAQ · CTA final

## Planos

| Plano | Preço | Inclui |
|---|---|---|
| FREE | R$ 0 | 1 página, até 5 links, QR Code, analytics básico |
| STARTER | R$ 9,90/mês | Mais links, personalização, analytics, QR Code |
| PRO | R$ 19,90/mês | Links ilimitados, analytics completo, formulários, leads, personalização avançada, sem marca LINKFIVE |
| BUSINESS | R$ 39,90/mês | Múltiplas páginas, equipe, leads, analytics avançado |

Pagamento real **não** entra agora — mas a arquitetura nasce preparada pro
gateway.

## Escopo por fase

- **MVP:** landing, cadastro, login, dashboard, criar página, criar links,
  página pública, WhatsApp, QR Code, contador de views, contador de cliques,
  personalização básica
- **Fase 2:** formulários, leads, analytics avançado, produtos, serviços
- **Fase 3:** planos, assinaturas, pagamento, equipes
- **Fase 4:** recursos avançados, automação, integrações, API

## Regras dadas pelo cliente

1. Apresentar a arquitetura completa **antes** de escrever código → feito em
   [arquitetura.md](arquitetura.md)
2. Nada de telas estáticas: funcionalidade real com dados persistidos
3. Testar o fluxo completo de cada funcionalidade antes de avançar
4. Estruturar desde o início para virar SaaS comercial com cobrança recorrente
5. Não copiar a identidade visual do Linktree nem do W.app

## Pendências que dependem do Alessandro

1. ~~**Domínio**~~ — **RESOLVIDO em 07/09/2026:** o domínio será
   `linkfive.com.br`, e a marca foi alinhada pra **LINKFIVE** (era LINKFY) pra
   casar exatamente com o que o cliente digita. Falta só registrar.
2. **E-mail transacional** — necessário pra recuperação de senha (sugestão:
   Resend, 3.000/mês grátis)
3. **LGPD** — política de privacidade e termos de uso antes de aceitar cadastro
   real, já que o sistema guarda leads de terceiros
4. **Upload de imagem** — Vercel Blob ou, no MVP, aceitar URL colada
