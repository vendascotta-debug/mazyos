// ---------------------------------------------------------------------------
// Links curtos diretos.
//
// linkfive.com.br/w/abc123 → redireciona na hora para a conversa do WhatsApp.
// Nenhuma página no meio: o cliente toca no link e já está digitando.
//
// É o formato do w.app. Convive com a página de links, e não a substitui: a
// página serve pra "todos os meus canais", o link curto serve pra "fala comigo
// agora" — num anúncio, num cartão, numa etiqueta de produto.
// ---------------------------------------------------------------------------

export interface ShortLink {
  id: string;
  userId: string;
  code: string;
  title: string;
  numero: string;
  mensagem: string | null;
  destino: string;
  active: boolean;
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
