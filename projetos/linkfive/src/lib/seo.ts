/**
 * Dados de SEO num lugar só.
 *
 * O host sai de `NEXT_PUBLIC_SITE_URL`, a mesma variável que o QR Code e o
 * sitemap já usam — ver NOTA-HOST.md. Repetir a string aqui criaria a chance
 * de um dia o canonical apontar para um host e o sitemap para outro, que é
 * exatamente o problema que aquela nota mandou nunca mais ter.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://linkfive.com.br";

export const SITE = {
  nome: "LinkFive",
  razaoSocial: "Cottag Brasil Negócios e Representações Ltda",
  cnpj: "04.967.880/0001-20",
  /** 1200x630. Sem isso o link compartilhado no WhatsApp sai sem cartão. */
  ogImage: "/og-image.png",
  emailResposta: "linkfive.app@gmail.com",
} as const;

/**
 * O par título/descrição da home, num lugar só porque três consumidores
 * precisam dele idêntico: <title>, og:title e twitter:title.
 *
 * O título antigo — "LINKFIVE — Seu link. Sua marca. Seus clientes." — é a
 * promessa da marca, não um termo de busca: ninguém digita isso no Google.
 * O nome fica no fim, que é onde o Google costuma cortar de qualquer forma.
 */
export const TITULO_HOME = "Link na bio com WhatsApp e captura de leads | LinkFive";

export const DESCRICAO_HOME =
  "Uma página que transforma quem chega em contato: WhatsApp com mensagem pronta, " +
  "formulário de captura e os leads organizados no seu painel. Grátis, sem cartão.";

/** Caminho relativo -> URL absoluta no host canônico. */
export const abs = (caminho = "/") => new URL(caminho, SITE_URL).toString();
