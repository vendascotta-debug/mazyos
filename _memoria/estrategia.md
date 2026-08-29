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

**NO AR:** https://prospecta-two-beta.vercel.app (Vercel, plano Hobby, projeto
`prospecta` sob a conta vendascotta-2685; repositório `vendascotta-debug/mazyos`,
Root Directory = `prospecta`, deploy automático a cada push na main).

Tem **login de verdade**: contas por usuário (scrypt + cookie de sessão
assinado), leads/listas/histórico privados por conta, base de 750 empresas
compartilhada. Testado em produção: isolamento entre contas confirmado.

**Para usar local:** duplo clique em `prospecta/1-INICIAR.bat`.

**Pendência conhecida:** a base é de DEMONSTRAÇÃO — empresas, sites, e-mails e
LinkedIn são gerados, os links não abrem. Próximo passo grande: ligar os
conectores reais em `src/lib/providers.ts` (Receita Federal/CNPJ via BrasilAPI,
OpenStreetMap, avaliações de mapa).

Nota: Alessandro achou o passo a passo confuso — retomar devagar, um passo por
vez, sem despejar tudo de uma vez.

Gargalo geral do negócio ainda não definido com clareza pelo Alessandro.
Retomar essa pergunta quando o negócio tiver mais forma.

## O que pode esperar

*(nada registrado ainda)*

## Contexto com prazo

*(nada registrado ainda)*
