import { PLANOS } from "@/lib/limites";

/**
 * As perguntas da pagina /precos.
 *
 * Duas respostas aqui sao POLITICA DE NEGOCIO, nao codigo: as formas de
 * pagamento (hoje so cartao, conforme o painel do Stripe) e o reembolso de 7
 * dias. Se qualquer uma das duas mudar, muda aqui — e o texto some da pagina
 * e do JSON-LD junto, porque os dois leem este array.
 */
export const FAQ_PRECOS = [
  {
    p: "Posso cancelar quando quiser?",
    r: "Pode, sem multa e sem falar com ninguém. A assinatura continua valendo até o fim do período que você já pagou; depois a conta volta para o plano Grátis. Suas páginas continuam no ar e nada é apagado — o limite do plano menor vale para criar página nova, não para derrubar o que já existe.",
  },
  {
    p: "E se eu desistir logo depois de assinar?",
    r: "Você tem 7 dias para pedir o dinheiro de volta, por qualquer motivo. É o direito de arrependimento previsto no Código de Defesa do Consumidor para compra pela internet, e aqui vale integral.",
  },
  {
    p: "Como eu pago?",
    r: "Cartão de crédito, pelo checkout seguro do Stripe. O LINKFIVE não vê e não guarda o número do seu cartão em momento nenhum.",
  },
  {
    p: "Qual a diferença entre pagar por mês e por ano?",
    r: `A mesma coisa, pelo mesmo preço de lista — o anual só sai mais barato. O Starter fica em R$ ${(PLANOS.starter.precoAnualCents! / 100 / 12).toFixed(2).replace(".", ",")} por mês em vez de R$ ${(PLANOS.starter.precoCents / 100).toFixed(2).replace(".", ",")}, e o Pro em R$ ${(PLANOS.pro.precoAnualCents! / 100 / 12).toFixed(2).replace(".", ",")} em vez de R$ ${(PLANOS.pro.precoCents / 100).toFixed(2).replace(".", ",")}.`,
  },
  {
    p: "O plano Grátis tem prazo para acabar?",
    r: `Não tem. Não é teste de 14 dias: é um plano, e ele fica. São ${PLANOS.free.maxPaginas} páginas, ${PLANOS.free.maxCurtosMes} links diretos novos por mês, QR Code e código personalizado, sem cartão de crédito.`,
  },
  {
    p: "Vocês colocam anúncio nos meus links?",
    r: "Em nenhum plano, nem no gratuito. É a diferença mais concreta entre aqui e os encurtadores que ganham dinheiro com a tela de espera.",
  },
  {
    p: "Posso trocar de plano depois?",
    r: "Pode, para cima ou para baixo, quando quiser. Subindo, os limites novos valem na hora. Descendo, você perde os recursos do plano maior — o formulário de captura, por exemplo, some das páginas e para de gravar contato — mas as páginas que você já publicou continuam no ar, e os leads que já entraram continuam na sua conta.",
  },
  {
    p: "Os contatos que eu capturar são meus?",
    r: "São seus. Os leads ficam na sua conta, só você enxerga, e você pode exportar quando quiser.",
  },
  {
    p: "Preciso de CNPJ para assinar?",
    r: "Não. Pessoa física assina do mesmo jeito.",
  },
];
