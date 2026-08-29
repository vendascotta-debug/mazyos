import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Primeira barreira: sem cookie de sessão, nem chega a renderizar a página.
 *
 * Aqui só olhamos a presença do cookie — a verificação da assinatura roda no
 * servidor (`requireUser`), porque o middleware da Vercel executa no Edge e não
 * tem o `node:crypto` que usamos para assinar. Ou seja: forjar um cookie passa
 * pelo middleware, mas morre na página.
 */
export function middleware(req: NextRequest) {
  const temSessao = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (temSessao) return NextResponse.next();

  const url = new URL("/entrar", req.url);
  return NextResponse.redirect(url);
}

export const config = {
  // Protege as telas. As rotas de API ficam de fora porque cada uma já checa a
  // sessão e responde 401 — redirecionar um fetch para HTML de login faria o
  // front receber uma página onde esperava JSON.
  matcher: [
    "/((?!entrar|cadastrar|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
