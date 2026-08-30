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

**DADOS REAIS (29/08/2026):** a base de demonstração saiu. Agora são **103.933
empresas ativas de São Paulo** vindas dos Dados Abertos do CNPJ da Receita
Federal (snapshot de jan/2026), em 629 cidades — 85 mil com sócios nominados,
97 mil com telefone, 95 mil com e-mail.

Pipeline em `prospecta/scripts/` (BigQuery via Base dos Dados). Chave da conta
de serviço em `prospecta/google-bigquery.json` (fora do git).

**Pendências:**
1. **COBERTURA: só 13% do disponível.** Erro de desenho meu — reparti cota igual
   entre subsegmentos, então restaurante ficou com 6.896 de 107.745 e hotel com
   98%. A cota do BigQuery (1 TB/mês) acabou em 29/08 e **renova em 1º de
   setembro**. Rodar então uma varredura única com piso por subsegmento,
   mirando ~500 mil empresas (~350 MB, cabe no plano gratuito):
   `node scripts/importar.mjs completar 500000`
   Antes de rodar, corrigir a repartição: garantir todos os subsegmentos com
   menos de 15 mil disponíveis e preencher o resto por porte/capital.

   **Teste de aceite combinado com o Alessandro:** depois da carga, procurar
   "juarez" com a busca ampla. O Bar do Juarez (rede tradicional de SP — Itaim,
   Pinheiros, Brooklin, Moema) tem de aparecer com os sócios certos. Hoje ele
   não está na base: só 6.896 dos 55.068 bares foram importados.
2. **Landing page de vendas** do Prospecta — página pública para vender o
   produto (ainda não existe; hoje a raiz cai direto no login).
3. **Painel de administrador**: papel de admin, lista de quem se cadastrou,
   marcar conta como cortesia ou pagante, bloquear acesso e vencimento.
4. **DESEMPENHO da busca** (descoberto em 29/08 no teste de telas): a busca
   carrega TODAS as empresas do segmento na memória (68 mil em Food Service)
   para calcular score e decisores em JavaScript. Levou mais de 30s em
   desenvolvimento. Precisa empurrar filtro, ordenação e paginação para o SQL —
   vai piorar quando a base completa entrar (500 mil). Ver `searchCompanies`
   em `src/lib/repo.ts`.
5. Mapa posiciona por cidade, não por rua (a Receita publica endereço, não
   coordenada). Melhoria futura: geocodificar sob demanda.
6. Site, Instagram e LinkedIn das empresas não vêm dessa fonte.

## Fila de trabalho do Prospecta (ordem combinada em 29/08/2026)

1. **1º de setembro:** carga completa dos dados (cota do BigQuery renova).
2. **Landing page** de venda do produto.
3. **Painel administrativo** de contas e cobrança.

Feito em 29/08/2026: dados reais da Receita (104 mil empresas), classificação
por nome corrigida, otimização de espaço, login com Google, olhinho na senha,
ações de editar/excluir lead, deploy na Vercel, layout adaptado a celular e
tablet (abas embaixo, filtros em gaveta, leads em cartões), bloco de contatos
mostrando todos os canais — os ausentes viram busca no Google/LinkedIn.

Nota: Alessandro achou o passo a passo confuso — retomar devagar, um passo por
vez, sem despejar tudo de uma vez.

Gargalo geral do negócio ainda não definido com clareza pelo Alessandro.
Retomar essa pergunta quando o negócio tiver mais forma.

## O que pode esperar

*(nada registrado ainda)*

## Contexto com prazo

*(nada registrado ainda)*
