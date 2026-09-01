# LIA — Atendente com IA 24h

> Projeto criado em 30/08/2026. Pasta dedicada — instruções aqui sobrescrevem as da raiz quando relevantes.

## Sobre

Criar um agente de atendimento com IA (WhatsApp) que conversa com quem entra em
contato em vez de responder como robô de menu — primeiro pro negócio do
Alessandro, depois vendido pro mercado.

O nome: **LIA** = ligação + inteligência artificial + atendimento, 24 horas.

## Tipo

Projeto interno.

## Modelo de negócio

**Infoproduto** (decisão do Alessandro em 30/08/2026): vender os arquivos do
sistema + instalação guiada por preço único, no modelo do concorrente
atendente24h. Sem mensalidade, sem infra nossa — o comprador hospeda na VPS
dele e paga o consumo de IA dele.

Consequências assumidas: sem receita recorrente e o produto é copiável por
quem compra. A troca é entrada de caixa rápida e custo de operação quase zero.

## Entregas previstas

- Automação: o agente de atendimento em si (robô de WhatsApp + painel)

## Onde salvar o que

- Briefing e contexto: nessa pasta
- Entregas: `automacao/`

## Contexto que herda da raiz

Esse projeto herda automaticamente o tom de voz, marca e contexto do negócio
definidos em `_memoria/` e `identidade/` da raiz. Não duplicar essas
informações aqui.

## Específico desse projeto

- **Referência de mercado:** https://atendente24h.cirorosa.com/ — análise em
  `briefing.md`. É referência, não gabarito: copiar o que funciona, corrigir o
  que é fraco.
- **Decisão em aberto (bloqueia o custo e o prazo):** WhatsApp via biblioteca
  não oficial (barato, número pode ser banido) ou via API oficial da Meta
  (segura, exige aprovação e cobra por conversa). Decidir antes de escrever
  código do robô.
- **Reaproveitar o Prospecta** onde der: contas/login, CRM, listas e dashboard
  já existem e resolvem boa parte do painel.
- Ao explicar passo a passo pro Alessandro: um passo por vez, sem despejar tudo
  de uma vez.
