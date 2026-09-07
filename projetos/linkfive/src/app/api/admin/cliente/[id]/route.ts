import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { definirPapel, definirPlano, suspenderPagina } from "@/lib/admin";
import { q1 } from "@/lib/db";

const Corpo = z.object({
  plano: z.string().optional(),
  papel: z.enum(["admin", "user"]).optional(),
  suspender: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ações do admin sobre uma conta.
 *
 * Toda a proteção mora aqui, no servidor. O painel esconder o botão não vale
 * nada: quem souber o endereço pode chamar a rota direto.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const eu = await currentUser();
  if (!eu) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (eu.role !== "admin") {
    // 404 e não 403: para quem não é admin, esta rota simplesmente não existe.
    return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });
  }

  const { id } = await params;
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const alvo = await q1<{ id: string }>("SELECT id FROM users WHERE id = ?", [id]);
  if (!alvo) return NextResponse.json({ erro: "Conta não encontrada." }, { status: 404 });

  if (parsed.data.plano !== undefined) {
    const ok = await definirPlano(id, parsed.data.plano);
    if (!ok) return NextResponse.json({ erro: "Plano desconhecido." }, { status: 400 });
  }

  if (parsed.data.papel !== undefined) {
    // Ninguém tira o próprio acesso de admin: ficaria trancado do lado de fora
    // do painel, e só um outro admin poderia devolver.
    if (id === eu.id) {
      return NextResponse.json(
        { erro: "Você não pode alterar o próprio acesso de administrador." },
        { status: 400 },
      );
    }
    await definirPapel(id, parsed.data.papel);
  }

  if (parsed.data.suspender !== undefined) {
    const page = await q1<{ id: string }>("SELECT id FROM pages WHERE user_id = ?", [id]);
    if (!page) return NextResponse.json({ erro: "Essa conta não tem página." }, { status: 404 });
    await suspenderPagina(page.id, parsed.data.suspender);
  }

  return NextResponse.json({ ok: true });
}
