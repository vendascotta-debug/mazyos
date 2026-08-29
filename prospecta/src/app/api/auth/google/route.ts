import { NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE, googleConfigurado, novoState, urlDeAutorizacao } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Manda o usuário para a tela de escolha de conta do Google. */
export async function GET(req: Request) {
  if (!googleConfigurado()) {
    return NextResponse.redirect(new URL("/entrar?erro=google-nao-configurado", req.url));
  }

  const origin = new URL(req.url).origin;
  const state = novoState();

  const res = NextResponse.redirect(urlDeAutorizacao(origin, state));
  // O `state` volta do Google e é comparado no callback: é o que impede alguém
  // de forjar um retorno de login.
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
