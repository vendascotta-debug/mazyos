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
  // Tudo é protegido, menos o próprio fluxo de login e os arquivos estáticos.
  matcher: [
    "/((?!entrar|cadastrar|api/auth|api/seed|_next/static|_next/image|favicon.ico).*)",
  ],
};
