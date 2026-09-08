# Estratégia

> O que importa agora. Prioridades, metas, prazos.
> O Claude usa isso pra decidir o que sugerir primeiro e o que adiar.
> Atualize sempre que as prioridades mudarem.

## Fase

Negócio em fase inicial (pré-lançamento) — solopreneur começando com
site com IA / ecossistema de IA.

## Segunda frente: LINKFIVE (desde 07/09/2026)

**LINKFIVE** (`projetos/linkfive/`) — SaaS de links para WhatsApp e redes, com
foco em vendas. Faz **duas coisas que os concorrentes fazem separadas**:

1. **Página de links** (`/oficinadocarlos`) — todos os canais num endereço só,
   no formato do Linktree
2. **Link direto e encurtador** (`/w/orcamento`) — redireciona na hora pro
   WhatsApp ou pra qualquer URL, sem tela no meio, no formato do W.app

O Linktree não faz a 2. O W.app não faz a 1. Esse é o diferencial, e foi
definido em 07/09/2026 comparando com o W.app que o Alessandro já usa.

Público: empresas, profissionais e criadores — quem vende.

**Status: NO AR desde 07/09/2026** — https://linkfive.com.br
(exemplos: página em `/oficinadocarlos`, link direto em `/w/orcamento`). Vercel, projeto `linkfive`, Root Directory
`projetos/linkfive`, GitHub conectado: todo push na `main` publica sozinho.

81 verificações automatizadas passando (`npm run teste`), rodadas **também
contra produção** (`LINKFIVE_URL=https://linkfive.com.br node scripts/teste-mvp.mjs`).
Há também `npm run teste:animacao`, que confere a entrada ao rolar e o modo de
movimento reduzido.

Atenção: produção e desenvolvimento dividem o mesmo banco. Rodar o teste cria
contas reais em produção. **Depois de rodar, limpar** (o script de limpeza
apaga contas `%@teste.com`). Separar os bancos é a primeira coisa a fazer no
lançamento.

**Já construído além do MVP:** painel administrativo (`/admin`) com visão
geral, lista de clientes e aba de cobrança; plano **Cortesia** (fora da página
de preços, só o admin concede); formulário de captura de leads; termos e
política de privacidade; integração de cobrança com o **Lastlink**; métricas
de origem/aparelho/país com **cadeado** no que o plano não cobre; e a tela de
**Consumo** com barras de uso e a data em que a cota zera.

O Alessandro é admin (`ADMIN_EMAILS` na Vercel + no banco) e está no Cortesia.

### Planos (revisão de 07/09/2026, espelhando o url.gratis)

Três planos: **Grátis**, **Starter** (R$ 19,90/mês ou R$ 199,90/ano) e **Pro**
(R$ 39,90/mês ou R$ 399/ano). O Business saiu e foi absorvido pelo Pro — há um
mapa de legado em `limites.ts` para contas antigas.

Dois tetos para links diretos: **ativos** (10.000) e **criados por mês** (100
no Grátis, 300 no Starter). O primeiro é número de vitrine; o segundo é o que
segura o uso de verdade.

Duas coisas do concorrente que **não** copiamos, e por quê: anúncios no plano
pago e QR Code cobrado. Ambos tirariam algo de quem já tem.

### Identidade visual (revisão de 08/09/2026)

Era violeta + âmbar; virou **azul**, a pedido, seguindo referência de agência:
fundo azul-marinho `#050a18`, ação azul elétrico `#1e6bff`, acento ciano
`#38bdf8`. Verde segue proibido.

Nota honesta registrada no CSS: essa família de azul é a mesma do url.gratis.
Ganhamos cara de produto de tecnologia e perdemos parte da distinção.

**Regra que vale para sempre:** nunca fabricar prova social. Nada de logo de
cliente, depoimento ou número de usuários inventado. A faixa de números do
hero traz fatos do produto, conferíveis abrindo o site.

### PARADO EM (08/09/2026, fim do dia) — retomar por aqui

**1. ~~Domínio~~ FEITO.** `linkfive.com.br` no ar com HTTPS, DNS na Hostinger
(`A @ → 216.198.79.1`), `NEXT_PUBLIC_SITE_URL` já apontando pro domínio
próprio, verificado no build. **Pode imprimir QR Code.**

**2. Lastlink — falta o Alessandro:** criar os produtos (mensal e anual =
4 produtos), cadastrar o webhook
`/api/webhooks/lastlink` (token em `projetos/linkfive/.env.local`, na variável
`LASTLINK_WEBHOOK_SECRET`, já espelhado na Vercel), e passar os **IDs dos
produtos** e os **links de checkout**. Aí é só preencher `LASTLINK_PRODUTOS` e
`LASTLINK_CHECKOUT_*` — os botões de assinar saem do "Em breve" sozinhos.
   O webhook grava o payload cru de tudo em `/admin/cobranca`: quando a
   primeira venda entrar, é de lá que sai o mapeamento definitivo dos campos.

**3. Termos e privacidade** precisam de revisão jurídica e dos dados da
empresa. O ponto crítico é a seção 1 da privacidade (quem é controlador dos
leads).

Escolha registrada: **Lastlink primeiro, Mercado Pago depois.** Não por ser
melhor — é mais caro e pior pra upgrade no meio do ciclo — mas porque com zero
clientes a pergunta é "alguém paga?", não "qual taxa é menor". A tabela
`subscriptions` tem `gateway` e `gateway_id` justamente para a troca sair
barata.

É um produto **independente do Prospecta**: código, deploy, domínio e clientes
separados. Divide só a instância Neon, em schema `linkfive` — decisão de custo,
não de arquitetura. Separar é trocar duas variáveis de ambiente, e a hora de
fazer isso é quando entrar o primeiro cliente pagante ou o Neon avisar de
limite.

Pendências que travam o lançamento: registrar `linkfive.com.br`, serviço de
e-mail para recuperação de senha, política de privacidade e termos (LGPD, o
sistema guarda leads de terceiros) e upload de imagem.

Documento de arquitetura: `projetos/linkfive/arquitetura.md`.

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
