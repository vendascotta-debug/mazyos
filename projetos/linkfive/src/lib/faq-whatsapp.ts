/**
 * As perguntas da pagina /gerador-de-link-whatsapp.
 *
 * Mesmo desenho do lib/faq.ts: um array so, lido pelo acordeao visivel e pelo
 * JSON-LD. As perguntas nao sao inventadas — saem do "As pessoas tambem
 * perguntam" do Google para "gerar link de whatsapp com mensagem pronta" e das
 * duvidas que o proprio gerador ja trata em codigo (numero com DDD, link de
 * grupo colado no campo de telefone, prazo do link de visitante).
 */
import { PLANOS } from "@/lib/limites";

export const FAQ_WHATSAPP = [
  {
    p: "Preciso ter WhatsApp Business?",
    r: "Não. O link funciona igual no WhatsApp comum e no Business — ele só abre a conversa com o seu número. O Business ajuda em outras coisas (catálogo, respostas rápidas, horário de atendimento), mas não é exigência para o link.",
  },
  {
    p: "Quem clica consegue ver o meu número?",
    r: "Sim. O link abre a conversa com o seu número, então ele aparece para quem clicou, do mesmo jeito que apareceria se a pessoa digitasse. Se você não quer expor o seu pessoal, use um chip separado para o atendimento.",
  },
  {
    p: "Como escrevo o número? Preciso do código do país?",
    r: "Digite com DDD, do jeito que você fala: 11 99999-9999. O código do Brasil (55) é acrescentado automaticamente. Se o seu número for de fora, escreva com o código do país na frente.",
  },
  {
    p: "Funciona com telefone fixo?",
    r: "Funciona se aquele número estiver registrado no WhatsApp Business — o registro de fixo é feito por chamada de voz, e é comum em clínica, escritório e loja. Se o fixo não tem WhatsApp, o link abre uma conversa que nunca vai ser lida.",
  },
  {
    p: "Posso mudar a mensagem ou o número depois?",
    r: "Com conta, sim: o link continua o mesmo e você troca o destino por dentro. Sem conta, não — o link já sai pronto e para mudar é preciso gerar outro. É o motivo principal para criar a conta antes de mandar imprimir QR Code.",
  },
  {
    p: "Dá para usar com link de grupo?",
    r: "Link de grupo é outra coisa: ele começa com chat.whatsapp.com e já é um endereço, não um telefone. Cole ele na aba \"Encurtador de Link\" — o resultado é um link curto seu, que você pode trocar depois.",
  },
  {
    p: "Quantos links posso criar de graça?",
    r: `Sem conta, um por vez, na hora. Com a conta gratuita são ${PLANOS.free.maxCurtosMes} links novos por mês, com QR Code e código personalizado, e sem prazo para acabar.`,
  },
  {
    p: "O link que eu gerar aqui expira?",
    r: "O link criado sem conta vale 30 dias. Criando a conta, ele passa a ser seu e o prazo some — o mesmo endereço continua funcionando, sem precisar refazer nada nem trocar o QR Code já impresso.",
  },
];
