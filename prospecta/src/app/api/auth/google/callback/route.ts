import { NextResponse } from "next/server";
import { createSessionToken, findOrCreateGoogleUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { GOOGLE_STATE_COOKIE, googleConfigurado, trocarCodigoPorPerfil } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Retorno do Google: valida o state, troca o código e abre a sessão. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const erroGoogle = url.searchParams.get("error");
  if (erroGoogle) {
    // Ex.: o usuário clicou em "Cancelar" na tela do Google.
    return NextResponse.redirect(new URL("/entrar", url.origin));
  }

  if (!googleConfigurado()) {
    return NextResponse.redirect(new URL("/entrar?erro=google-nao-configurado", url.origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateSalvo = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${GOOGLE_STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!code || !state || !stateSalvo || state !== stateSalvo) {
    return NextResponse.redirect(new URL("/entrar?erro=google-state", url.origin));
  }

  try {
    const perfil = await trocarCodigoPorPerfil(code, url.origin);
    const user = await findOrCreateGoogleUser(perfil);

    const res = NextResponse.redirect(new URL("/buscar", url.origin));
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("[google-oauth]", e);
    return NextResponse.redirect(new URL("/entrar?erro=google-falhou", url.origin));
  }
}
