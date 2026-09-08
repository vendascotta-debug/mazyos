// ---------------------------------------------------------------------------
// Links curtos diretos.
//
// linkfive.com.br/w/abc123 → redireciona na hora para o destino.
// Nenhuma página no meio: o cliente toca no link e já chegou.
//
// Dois tipos:
//   whatsapp → o usuário informa o número e a mensagem, e o sistema monta o
//              wa.me. É o caso que mais aparece nesse produto.
//   url      → encurtador comum: encurta qualquer endereço, com o mesmo QR e
//              o mesmo contador.
//
// É o formato do w.app. Convive com a página de links, e não a substitui: a
// página serve pra "todos os meus canais", o link curto serve pra "fala comigo
// agora" — num anúncio, num cartão, numa etiqueta de produto.
// ---------------------------------------------------------------------------

export type TipoCurto = "whatsapp" | "url";

export interface ShortLink {
  id: string;
  userId: string;
  code: string;
  tipo: TipoCurto;
  title: string;
  /** Só nos links de WhatsApp. Nos de URL vem null. */
  numero: string | null;
  mensagem: string | null;
  destino: string;
  active: boolean;
  /** Data em que o link para de funcionar. null = não expira. */
  expiraEm: string | null;
  /** Só diz SE tem senha. O hash nunca sai do servidor. */
  temSenha: boolean;
  clicksTotal: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alfabeto do código curto.
 *
 * Sem 0/O e sem 1/l/I: o código é lido em voz alta e digitado à mão a partir
 * de um cartão impresso. Confundir zero com O faz o cliente cair em erro 404 e
 * desistir — e ninguém liga pra avisar que o link não abriu.
 */
const ALFABETO = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const TAMANHO_CODIGO = 6;

export function gerarCodigo(tamanho = TAMANHO_CODIGO): string {
  let saida = "";
  for (let i = 0; i < tamanho; i++) {
    saida += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return saida;
}

/** Aceita só o que o gerador produz — barra tentativa de sondar a tabela. */
export function codigoValido(code: string): boolean {
  if (code.length < 4 || code.length > 12) return false;
  return [...code].every((c) => ALFABETO.includes(c));
}

/**
 * Código personalizado que o usuário escolheu.
 *
 * Aceita letra, número e hífen — mais solto que o gerado, porque aqui ele está
 * digitando algo que quer que faça sentido ("promo-julho"). O que não pode é
 * colidir com as rotas do próprio sistema.
 */
const CODIGOS_RESERVADOS = new Set(["api", "app", "admin", "novo", "editar", "qr", "w"]);

export function validarCodigoPersonalizado(
  code: string,
): { ok: true } | { ok: false; erro: string } {
  if (code.length < 3) return { ok: false, erro: "O código precisa ter pelo menos 3 caracteres." };
  if (code.length > 24) return { ok: false, erro: "O código pode ter no máximo 24 caracteres." };
  if (!/^[a-zA-Z0-9-]+$/.test(code)) {
    return { ok: false, erro: "Use apenas letras, números e hífen." };
  }
  if (code.startsWith("-") || code.endsWith("-")) {
    return { ok: false, erro: "O código não pode começar nem terminar com hífen." };
  }
  if (CODIGOS_RESERVADOS.has(code.toLowerCase())) {
    return { ok: false, erro: "Esse código é reservado pelo sistema." };
  }
  return { ok: true };
}

/**
 * Normaliza a URL que o usuário colou.
 *
 * Aceita sem protocolo ("meusite.com.br"), porque é assim que as pessoas
 * digitam. Recusa `javascript:` e afins: o link curto é público e não pode
 * virar vetor de execução no navegador de quem clicar.
 */
export function normalizarUrl(bruto: string): { ok: true; url: string } | { ok: false; erro: string } {
  const limpo = bruto.trim();
  if (!limpo) return { ok: false, erro: "Cole o endereço que o link deve abrir." };

  const comProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(limpo) ? limpo : `https://${limpo}`;

  let u: URL;
  try {
    u = new URL(comProtocolo);
  } catch {
    return { ok: false, erro: "Endereço inválido. Confira se está completo." };
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, erro: "Só é possível encurtar endereços http e https." };
  }
  if (!u.hostname.includes(".")) {
    return { ok: false, erro: "Endereço inválido. Falta o domínio (ex.: meusite.com.br)." };
  }

  return { ok: true, url: u.toString() };
}

/** Domínio do destino, para mostrar na listagem. */
export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
