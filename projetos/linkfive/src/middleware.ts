import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// ---------------------------------------------------------------------------
// Primeira barreira das rotas privadas.
//
// Roda no runtime Edge, que não tem `node:crypto` — então aqui NÃO validamos a
// assinatura do cookie nem consultamos o banco. Só checamos se existe um cookie
// com formato plausível, pra mandar o visitante deslogado direto pro login sem
// pagar um render à toa.
//
// A validação de verdade (assinatura HMAC, expiração, usuário existe) acontece
// no servidor, em `requireUser()`, que toda página de /app e /admin chama. Um
// cookie forjado passa por aqui e morre lá.
// ---------------------------------------------------------------------------

const PRIVADAS = ["/app", "/admin", "/onboarding"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PRIVADAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  // Formato do token: userId.expiracao.assinatura
  const plausivel = Boolean(token && token.split(".").length === 3);

  if (!plausivel) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    // Guarda pra onde ele queria ir, e volta pra lá depois do login.
    url.searchParams.set("destino", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/onboarding/:path*"],
};
