# LINKFIVE

SaaS de links para WhatsApp e redes sociais, com foco em vendas e geração de
clientes. Faz **duas coisas que os concorrentes fazem separadas**:

- **Página de links** (`linkfive.com.br/oficinadocarlos`) — todos os canais num
  endereço só, no formato do Linktree
- **Link direto** (`linkfive.com.br/w/tDhwE3`) — abre a conversa no WhatsApp na
  hora, sem tela no meio, no formato do W.app

O Linktree não faz o link direto. O W.app não faz a página.

**NO AR:** https://linkfive-seven.vercel.app
**Exemplo de página:** https://linkfive-seven.vercel.app/oficinadocarlos
**Domínio definitivo (a registrar):** linkfive.com.br

- **Arquitetura e decisões técnicas:** [arquitetura.md](arquitetura.md) — leia antes de mexer
- **Briefing original:** [briefing.md](briefing.md)
- **Regras do projeto:** [CLAUDE.md](CLAUDE.md)

---

## Rodar na sua máquina

```bash
cd projetos/linkfive
npm install
npm run dev
```

Abre em http://localhost:3000

O `.env.local` já está configurado, apontando para o mesmo banco Neon do
Prospecta, no schema `linkfive` (as tabelas não se misturam). Se precisar
recriar, copie o `.env.example` e preencha.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run teste` | Teste ponta a ponta do MVP (precisa do `dev` rodando) |
| `npm run db:status` | Mostra em qual schema está e quantas linhas tem cada tabela |

## O que já funciona

Testado ponta a ponta em 07/09/2026 — 42 verificações, todas passando
(`npm run teste`):

- [x] Landing page completa
- [x] Cadastro com endereço (slug) validado e checado em tempo real
- [x] Login, logout, proteção de rotas
- [x] Isolamento entre contas (uma conta não lê nem escreve na página da outra)
- [x] Editor de página com preview ao vivo em moldura de celular
- [x] Criar, editar, ativar/desativar, excluir e reordenar links (arrastando)
- [x] 13 tipos de link
- [x] Gerador de link do WhatsApp com mensagem pronta
- [x] **Links diretos** (/w/abc123): redireciona pro WhatsApp em 307, com QR
      próprio por link, contador de cliques, pausar/reativar e código
      personalizado opcional
- [x] Página pública responsiva em `/<slug>`
- [x] Publicar e despublicar
- [x] Contador de visualizações e de cliques, com rollup diário
- [x] Dashboard com métricas, gráficos e ranking de links
- [x] Analytics com filtro de período
- [x] QR Code (ver, baixar PNG, imprimir SVG)
- [x] 5 temas visuais
- [x] Onboarding de 5 etapas
- [x] Limites de plano aplicados no servidor
- [x] Painel de planos

## O que ainda não entrou

**Fase 2:** formulário de captura na página pública, tela de leads alimentada de
verdade, produtos e serviços com foto e preço.

**Fase 3:** cobrança (a estrutura de assinatura já existe, falta o gateway),
equipes.

**Pendências que dependem de decisão:**

1. Registrar o domínio `linkfive.com.br`
2. Serviço de e-mail para a recuperação de senha (sugestão: Resend)
3. Política de privacidade e termos — o sistema guarda leads de terceiros (LGPD)
4. Upload de imagem (hoje o avatar é URL colada; Vercel Blob resolve)

## Deploy

Já configurado. Vercel, projeto `linkfive` (conta `vendascotta-2685`), separado
do Prospecta, com **Root Directory = `projetos/linkfive`** e GitHub conectado —
**todo push na `main` publica sozinho**.

Variáveis em produção: `DATABASE_URL`, `DB_SCHEMA=linkfive`, `AUTH_SECRET`
(diferente do local, de propósito) e `NEXT_PUBLIC_SITE_URL`.

A Deployment Protection foi desligada: a Vercel liga por padrão em projeto novo
e ela redireciona todo visitante para o login da Vercel — o que faz sentido num
painel interno e inviabiliza um SaaS público.

Para rodar a bateria de testes contra produção:

```bash
LINKFIVE_URL=https://linkfive-seven.vercel.app node scripts/teste-mvp.mjs
```

⚠️ **Produção e desenvolvimento dividem o mesmo banco.** Rodar o teste cria
contas de verdade no banco de produção. Enquanto não houver usuário real isso é
inofensivo, mas é o primeiro motivo para separar os bancos quando o produto
lançar.
