import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, createUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  email: z.string().email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres."),
  nome: z.string().max(120).nullish(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const user = await createUser(parsed.data.email, parsed.data.senha, parsed.data.nome ?? null);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
    return res;
  } catch (e) {
    const msg = (e as Error).message;
    const conflito = msg.includes("Já existe");
    return NextResponse.json({ error: msg }, { status: conflito ? 409 : 500 });
  }
}
