import { NextResponse } from "next/server";
import { z } from "zod";
import { autenticar, setSessionCookie } from "@/lib/auth";
import { adotarCurtos } from "@/lib/repo";
import { curtosDoConvidado, esquecerConvidado } from "@/lib/convidado";

const Corpo = z.object({
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(1, "Digite sua senha."),
});

export async function POST(req: Request) {
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await autenticar(parsed.data.email, parsed.data.senha);
  if (!user) {
    // Mensagem única de propósito: dizer "esse e-mail não existe" entrega a
    // quem sonda quais e-mails têm conta aqui.
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  // Quem já tinha conta e encurtou na landing antes de entrar também leva o
  // link consigo — o caminho é o mesmo do cadastro.
  const adotados = await adotarCurtos(user.id, await curtosDoConvidado());
  if (adotados > 0) await esquecerConvidado();

  await setSessionCookie(user.id);
  return NextResponse.json({
    ok: true,
    destino: user.onboarded ? "/app" : "/onboarding",
    linksAdotados: adotados,
  });
}
