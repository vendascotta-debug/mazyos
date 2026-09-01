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

**Pendências (atualizado 01/09/2026):**

1. **CARGA DE DADOS — em andamento.** O BigQuery saiu de cena: a franquia
   gratuita conta a partir da criação do projeto (29/08), não do calendário, e
   está esgotada até ~29/09. O caminho novo é `scripts/receita.mjs`, que baixa
   os ZIPs de Dados Abertos da Receita e lê em streaming — sem cota, sem chave.
   Se a carga não tiver terminado, rodar de novo (é idempotente):
   `cd prospecta && node --max-old-space-size=6144 scripts/receita.mjs`
   Leva ~25 min. Teste de aceite: buscar "juarez" com "Buscar em toda a base".
2. **DESEMPENHO da busca** — subiu de prioridade. `searchCompanies` em
   `src/lib/repo.ts` carrega todas as empresas do segmento na memória para
   calcular score. Com meio milhão de empresas isso trava. Precisa empurrar
   filtro, ordenação e paginação para o SQL.
3. Mapa posiciona por cidade, não por rua (a Receita publica endereço, não
   coordenada).
4. Site, Instagram e LinkedIn não vêm dessa fonte — a interface oferece busca
   pronta no Google/LinkedIn no lugar.

## Fila de trabalho do Prospecta (ordem combinada em 29/08/2026)

1. Terminar a carga da Receita (ver pendência 1) e validar com o teste do
   Bar do Juarez.
2. **Landing page** de venda do produto.
3. **Painel administrativo** de contas e cobrança.
4. Desempenho da busca (ver pendência 2).

Feito em 01/09/2026: segmento "Utensílios e Equipamentos" (fornecedores do
Alessandro — fabricantes, importadores, atacado e lojas), remoção do segmento
de distribuidoras de alimentos, busca por palavra em vez de frase, barra de
filtros ativos com ✕, e o carregador direto da Receita Federal.

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
