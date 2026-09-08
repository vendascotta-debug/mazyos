# LINKFIVE

SaaS de links para WhatsApp e redes sociais, com foco em vendas e geração de
clientes. Faz **duas coisas que os concorrentes fazem separadas**:

- **Página de links** (`linkfive.com.br/oficinadocarlos`) — todos os canais num
  endereço só, no formato do Linktree
- **Link direto** (`linkfive.com.br/w/tDhwE3`) — abre a conversa no WhatsApp na
  hora, sem tela no meio, no formato do W.app
- **Encurtador de URL** — o mesmo /w/ encurta qualquer endereço, com QR e
  contador próprios

O Linktree não faz o link direto. O W.app não faz a página.

**NO AR:** https://linkfive.com.br (domínio próprio ativo desde 07/09/2026)
**Exemplo de página:** https://linkfive.com.br/oficinadocarlos

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

Testado ponta a ponta em 07/09/2026 — 75 verificações, todas passando
(`npm run teste`):

- [x] Landing page completa
- [x] Cadastro com endereço (slug) validado e checado em tempo real
- [x] Login, logout, proteção de rotas
- [x] Isolamento entre contas (uma conta não lê nem escreve na página da outra)
- [x] Editor de página com preview ao vivo em moldura de celular
- [x] Criar, editar, ativar/desativar, excluir e reordenar links (arrastando)
- [x] 13 tipos de link
- [x] Gerador de link do WhatsApp com mensagem pronta
- [x] **Links diretos** (/w/abc123) em dois tipos: WhatsApp (monta o wa.me a
      partir do número e da mensagem) e URL comum (encurta qualquer endereço).
      Redirecionam em 307, com QR próprio por link, contador de cliques,
      pausar/reativar e código personalizado opcional
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
- [x] **Painel administrativo** (/admin): visão geral com contas, pagantes,
      receita mensal e movimento; lista de clientes com plano, página,
      visitas, cliques, leads e última atividade; conceder plano, promover
      admin e suspender página
- [x] **Plano Cortesia**: não aparece na página de preços, só o admin concede
- [x] **Formulário de captura de leads** na página pública, com escolha de campos
- [x] **Cobrança pelo Lastlink**: página de assinatura, webhook com registro do
      payload cru, liberação e revogação automáticas de plano, e aplicação da
      compra feita antes do cadastro
- [x] **Termos de uso e política de privacidade** (rascunho, pendente de revisão jurídica)

## O que ainda não entrou

**Fase 2:** produtos e serviços com foto e preço.

**Fase 3:** cobrança (a estrutura de assinatura já existe, falta o gateway),
equipes.

**Pendências que dependem de decisão:**

1. **Lastlink**: criar os 3 produtos, cadastrar o webhook e preencher
   `LASTLINK_PRODUTOS` e `LASTLINK_CHECKOUT_*`. Até lá os botões de assinar
   mostram "Em breve".
2. Serviço de e-mail para a recuperação de senha (sugestão: Resend)
3. Revisão jurídica dos termos e da política de privacidade, e os dados da
   empresa (razão social, CNPJ, e-mail do encarregado)
4. Upload de imagem (hoje o avatar é URL colada; Vercel Blob resolve)

## Deploy

Já configurado. Vercel, projeto `linkfive` (conta `vendascotta-2685`), separado
do Prospecta, com **Root Directory = `projetos/linkfive`** e GitHub conectado —
**todo push na `main` publica sozinho**.

Variáveis em produção: `DATABASE_URL`, `DB_SCHEMA=linkfive`, `AUTH_SECRET`
(diferente do local, de propósito), `NEXT_PUBLIC_SITE_URL` e `ADMIN_EMAILS`.

`ADMIN_EMAILS` é a lista de e-mails que viram administradores automaticamente,
separados por vírgula. É daqui que nasce o primeiro admin — sem isso ninguém
conseguiria abrir o painel, porque só um admin promove outro. O papel é
sincronizado no cadastro e no login, não a cada requisição.

A Deployment Protection foi desligada: a Vercel liga por padrão em projeto novo
e ela redireciona todo visitante para o login da Vercel — o que faz sentido num
painel interno e inviabiliza um SaaS público.

Para rodar a bateria de testes contra produção:

```bash
LINKFIVE_URL=https://linkfive.com.br node scripts/teste-mvp.mjs
```

⚠️ **Produção e desenvolvimento dividem o mesmo banco.** Rodar o teste cria
contas de verdade no banco de produção. Enquanto não houver usuário real isso é
inofensivo, mas é o primeiro motivo para separar os bancos quando o produto
lançar.
