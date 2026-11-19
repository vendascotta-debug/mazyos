import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { ipDe, limparFalhas, minutosBloqueado, registrarTentativa } from "@/lib/limite";

export const dynamic = "force-dynamic";

const Schema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }
  const { email, senha } = parsed.data;
  const ip = ipDe(req);

  try {
    // Força bruta: 5 senhas erradas no mesmo e-mail (ou 30 no mesmo IP) em
    // 15 min bloqueiam novas tentativas até a janela passar.
    const espera = await minutosBloqueado("login", ip, email);
    if (espera > 0) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente de novo em ${espera} min ou entre com o Google.` },
        { status: 429, headers: { "Retry-After": String(espera * 60) } },
      );
    }

    const user = await authenticate(email, senha);
    // Mensagem única para e-mail inexistente e senha errada: não entregamos
    // a quem tenta adivinhar a informação de que a conta existe.
    if (!user) {
      await registrarTentativa("login", ip, email, false);
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    await limparFalhas(email);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
