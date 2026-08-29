# Estratégia

> O que importa agora. Prioridades, metas, prazos.
> O Claude usa isso pra decidir o que sugerir primeiro e o que adiar.
> Atualize sempre que as prioridades mudarem.

## Fase

Negócio em fase inicial (pré-lançamento) — solopreneur começando com
site com IA / ecossistema de IA.

## Prioridade principal

Prospecta (SaaS próprio, pasta `prospecta/`) — MVP construído em 28/08/2026.

**Status (29/08/2026): RODANDO.** Banco conectado e base carregada (380
empresas). Testado ponta a ponta: busca, ficha, salvar lead, CRM, listas,
dashboard.

**Banco: Neon (neon.tech), não Supabase** — a org free do Supabase permite só 2
projetos ativos e os dois (`autovault-mvp`, `Vicmotors`) estão em uso e não
podem ser pausados. Projeto Neon: `prospecta` (free, us-east-2), schema
`prospecta`, conexão pooled. Credenciais em `prospecta/.env.local`.

**Para usar:** duplo clique em `prospecta/1-INICIAR.bat` e esperar o navegador
abrir sozinho. O `2-CARREGAR-DADOS.bat` já rodou — não precisa de novo.

**Próximo passo quando quiser publicar:** deploy na Vercel (mesmas variáveis do
`.env.local` nas Environment Variables). Antes de mandar o link pra alguém,
falta autenticação — hoje o app não tem login.

Nota: Alessandro achou o passo a passo confuso — retomar devagar, um passo por
vez, sem despejar tudo de uma vez.

Gargalo geral do negócio ainda não definido com clareza pelo Alessandro.
Retomar essa pergunta quando o negócio tiver mais forma.

## O que pode esperar

*(nada registrado ainda)*

## Contexto com prazo

*(nada registrado ainda)*
