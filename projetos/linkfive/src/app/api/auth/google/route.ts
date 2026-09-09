import { NextResponse } from "next/server";
import { googleConfigurado, iniciarLoginGoogle } from "@/lib/google";

/**
 * O começo do "entrar com o Google": manda o visitante para lá.
 *
 * É um GET porque quem chama é um link, e o navegador precisa navegar de
 * verdade — não dá para fazer isso por fetch: o Google recusa ser carregado
 * dentro de outra página, e é assim que tem de ser.
 */
export async function GET(req: Request) {
  if (!googleConfigurado()) {
    // Sem credenciais, volta para o login com um recado em vez de estourar uma
    // tela de erro. Só acontece se o botão aparecer antes da configuração.
    return NextResponse.redirect(new URL("/entrar?erro=google-indisponivel", req.url), 307);
  }

  const destino = new URL(req.url).searchParams.get("destino");
  return NextResponse.redirect(await iniciarLoginGoogle(req, destino), 307);
}
