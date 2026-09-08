import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { pedidoDeSenhaValido, trocarSenhaComPedido } from "@/lib/repo";

// ---------------------------------------------------------------------------
// "Esqueci minha senha" — o uso do link.
//
// GET só diz se o token ainda serve, para a tela não pedir uma senha nova e só
// depois avisar que o link venceu.
//
// POST troca a senha. O token some do banco (fica marcado como usado) e as
// sessões antigas caem junto: quem trocou a senha porque desconfiava de invasão
// precisa que o invasor seja desconectado, e não só que a senha mude.
// ---------------------------------------------------------------------------

function hashDoToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Recado único: nunca diz se o link venceu, já foi usado ou nunca existiu. */
const RECADO_INVALIDO =
  "Esse link não vale mais. Peça um novo em \"Esqueci minha senha\".";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const pedido = token ? await pedidoDeSenhaValido(hashDoToken(token)) : null;
  return NextResponse.json({ valido: Boolean(pedido) });
}

const Corpo = z.object({
  token: z.string().trim().min(1),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function POST(req: Request) {
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }

  const pedido = await pedidoDeSenhaValido(hashDoToken(parsed.data.token));
  if (!pedido) return NextResponse.json({ erro: RECADO_INVALIDO }, { status: 400 });

  await trocarSenhaComPedido(pedido.userId, hashPassword(parsed.data.senha));

  // Entra direto. Quem acabou de provar que tem acesso ao e-mail e escolheu uma
  // senha nova não precisa digitá-la de novo na tela seguinte — e o cookie novo
  // é emitido depois do corte, então ele sobrevive à derrubada das sessões.
  await setSessionCookie(pedido.userId);

  return NextResponse.json({ ok: true, destino: "/app" });
}
