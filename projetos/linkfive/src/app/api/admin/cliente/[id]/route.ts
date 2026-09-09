import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { definirPapel, definirPlano, excluirConta, pausarConta, suspenderPagina } from "@/lib/admin";
import { q1 } from "@/lib/db";

const Corpo = z.object({
  plano: z.string().optional(),
  papel: z.enum(["admin", "user"]).optional(),
  /** Tira a PÁGINA do ar para o visitante. */
  suspender: z.boolean().optional(),
  /** Impede o DONO de entrar no painel. */
  pausarConta: z.boolean().optional(),
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

  if (parsed.data.pausarConta !== undefined) {
    // Pausar a si mesmo tranca o próprio admin do lado de fora, e só outro
    // admin poderia soltar. Se ele for o único, ninguém solta.
    if (id === eu.id) {
      return NextResponse.json({ erro: "Você não pode pausar a própria conta." }, { status: 400 });
    }
    await pausarConta(id, parsed.data.pausarConta);
  }

  if (parsed.data.suspender !== undefined) {
    const page = await q1<{ id: string }>("SELECT id FROM pages WHERE user_id = ?", [id]);
    if (!page) return NextResponse.json({ erro: "Essa conta não tem página." }, { status: 404 });
    await suspenderPagina(page.id, parsed.data.suspender);
  }

  return NextResponse.json({ ok: true });
}

/**
 * Exclui a conta. Método próprio de propósito: apagar não é "atualizar", e um
 * DELETE não é disparado por engano por quem estava mandando outra coisa.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  const eu = await currentUser();
  if (!eu) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (eu.role !== "admin") return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const { id } = await params;
  if (id === eu.id) {
    return NextResponse.json({ erro: "Você não pode excluir a própria conta." }, { status: 400 });
  }

  const alvo = await q1<{ id: string; role: string; email: string }>(
    "SELECT id, role, email FROM users WHERE id = ?",
    [id],
  );
  if (!alvo) return NextResponse.json({ erro: "Conta não encontrada." }, { status: 404 });

  // Outro admin só é excluído depois de rebaixado. Duas mãos para uma ação sem
  // volta — e evita que um admin apague outro num clique errado.
  if (alvo.role === "admin") {
    return NextResponse.json(
      { erro: "Remova o acesso de administrador antes de excluir esta conta." },
      { status: 400 },
    );
  }

  await excluirConta(id);
  return NextResponse.json({ ok: true, email: alvo.email });
}
