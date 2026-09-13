import { PLANOS } from "@/lib/limites";

/**
 * As perguntas frequentes.
 *
 * Saíram de dentro de `app/page.tsx` porque agora têm dois consumidores: o
 * acordeão visível e o JSON-LD de `FAQPage`. Se os dois tivessem cópias
 * próprias, um dia alguém corrigiria uma resposta e esqueceria a outra — e
 * schema que não bate com o texto da página é motivo de punição manual no
 * Google, não só de rich result perdido.
 */
export type Pergunta = { p: string; r: string };

export const FAQ: Pergunta[] = [
  {
    p: "Preciso saber mexer com site?",
    r: "Não. Você preenche quatro campos e sua página está no ar. Se souber usar o WhatsApp, sabe usar o LINKFIVE.",
  },
  {
    p: "Posso usar de graça?",
    // Os números saem de PLANOS, não escritos à mão: um limite alterado lá
    // corrigiria a tabela de preços e deixaria esta resposta mentindo.
    r:
      `Sim, e sem prazo para acabar. O plano gratuito dá ${PLANOS.free.maxPaginas} páginas, ` +
      `${PLANOS.free.maxCurtosMes} links diretos novos por mês, QR Code e código personalizado. ` +
      `As métricas ficam disponíveis por ${PLANOS.free.analyticsDias} dias — nos planos pagos, ` +
      `o histórico é bem maior. Sem cartão de crédito.`,
  },
  {
    p: "Vocês colocam anúncio nos meus links?",
    r: "Nunca, em nenhum plano — inclusive no gratuito. O link é seu e a página é sua; quem clica vê o que você colocou lá, e mais nada.",
  },
  {
    p: "Qual a diferença entre a página e o link direto?",
    r: "A página reúne todos os seus canais num endereço só — serve pra bio do Instagram e pro cartão. O link direto abre a conversa no WhatsApp na hora, sem tela no meio — serve pro anúncio e pro QR Code do balcão. Você usa os dois, cada um no seu lugar.",
  },
  {
    p: "Consigo mudar o endereço da página depois?",
    r: "Consegue, mas pense antes: o endereço antigo para de funcionar e os QR Codes já impressos deixam de abrir.",
  },
  {
    p: "Os contatos que eu receber são meus?",
    r: "São seus. Os leads ficam na sua conta, só você enxerga, e você pode exportar quando quiser.",
  },
  {
    p: "Funciona bem no celular?",
    r: "É onde a página mais é aberta, então é onde ela foi desenhada primeiro. O painel também funciona no celular.",
  },
];
