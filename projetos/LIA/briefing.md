# Briefing — LIA

**Data:** 30/08/2026
**Tipo:** projeto interno
**Nome:** LIA — ligação + inteligência artificial + atendimento, 24 horas

## Objetivo

Criar um agente de atendimento com IA que interaja de verdade com quem entra em
contato — não um robô de menu. Uso duplo: no negócio do Alessandro e vendido
pro mercado.

## Entregas previstas

- Automação: robô de atendimento + painel

## Modelo escolhido

Infoproduto. Vender arquivos + instalação guiada por preço único.

## Referência analisada — atendente24h.cirorosa.com

### O que é

Infoproduto vendido na Hotmart. **R$ 497 à vista ou 12× R$ 54,47.** O comprador
recebe os arquivos do robô e do painel, vídeo de instalação em duas trilhas
(iniciante e avançado) e 30 dias de suporte em grupo de WhatsApp. Hospeda na
VPS dele e paga o consumo de IA dele.

Headline: *"Você não precisa de mais um curso de IA. Precisa de uma coisa no ar."*
O argumento de venda é "tem linha de chegada": o teste de sucesso é mandar uma
mensagem e receber resposta.

### Funcionalidades do robô

- Responde a partir de uma base de conhecimento — quando não sabe, **não
  inventa: chama o humano**
- Envia e escuta áudio
- Compartilha documentos
- Qualifica leads
- Agenda reuniões
- Faz follow-up

### Funcionalidades do painel

- Relatório matinal automático: investimento, CPL, CAC, leads, agendados, fechados
- Funil kanban arrastável
- Score de lead por IA com próxima ação sugerida
- Integração com tráfego pago (Meta)
- Agenda do dia e atalhos de mensagens favoritas

### Bônus que eles empacotam

Checklist "Sem Bloqueio" (manter o número saudável), assistente que lê o
histórico do WhatsApp e escreve o prompt sozinho, kit de revenda (proposta,
tabela, contrato), gerador de carrossel com IA, automação de DM no Instagram.

### Stack aparente

Claude + VPS própria + API de WhatsApp + Meta/Instagram opcional + painel web.

### Garantias

7 dias de reembolso sem explicação, mais garantia de funcionamento. Transparência
como argumento (admitem que a primeira turma ainda não rodou em clientes).

## Conclusões

**Dá pra fazer igual.** Nada ali é fora de alcance: é orquestração de LLM + API
de WhatsApp + um CRM em cima.

**Onde dá pra ser melhor:**

1. **Custo de IA.** Eles citam R$ 16,60 por lead. Cache, modelo menor nas
   mensagens triviais e base de conhecimento bem indexada derrubam isso muito.
2. **Aproveitamento do que já existe.** O Prospecta já tem contas, login, CRM,
   listas e dashboard no ar (Vercel + Neon). Funil, ficha de lead e relatório
   são o mesmo tipo de tela — boa parte do painel é adaptação, não construção.
3. **Amarração com o Prospecta.** Lista de prospects virando conversa ativa no
   atendente é algo que o concorrente não tem. Diferencial de verdade.
4. **Instalação.** Se a instalação for mais simples que a deles, isso sozinho
   vende — é onde infoproduto de sistema costuma morrer.

**Fraquezas do modelo deles que herdamos ao copiar:** sem recorrência, e o
produto vaza (eles chegam a vender um kit de revenda). Aceito conscientemente.

**Risco principal: WhatsApp.**

- Biblioteca não oficial: barato e rápido, mas o número pode ser banido — por
  isso eles vendem o checklist "sem bloqueio".
- API oficial da Meta: segura, mas exige aprovação e cobra por conversa.

Essa escolha define custo, prazo e o que a gente promete na página de vendas.
**Decidir antes de começar o robô.**

## Pendências

1. Decidir a via do WhatsApp (não oficial × API oficial da Meta)
2. Definir preço e plataforma de venda
3. Definir o que entra no pacote (arquivos, vídeo de instalação, suporte, bônus)
4. Verificar se "LIA" já é usado por outra empresa de IA no Brasil antes de
   fixar o nome
