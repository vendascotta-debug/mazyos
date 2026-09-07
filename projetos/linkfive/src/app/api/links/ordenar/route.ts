import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { reordenarLinks } from "@/lib/repo";

const Corpo = z.object({
  pageId: z.string().min(1),
  ids: z.array(z.string().min(1)),
});

/** Grava a ordem nova depois do arrastar-e-soltar, em uma única chamada. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const ok = await reordenarLinks(user.id, parsed.data.pageId, parsed.data.ids);
  if (!ok) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
