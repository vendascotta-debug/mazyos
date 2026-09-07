import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, marcarOnboardingConcluido } from "@/lib/auth";
import { publicarPagina, paginaDoDono } from "@/lib/repo";

const Corpo = z.object({ pageId: z.string().min(1), publicar: z.boolean() });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });

  const page = await paginaDoDono(user.id, parsed.data.pageId);
  if (!page) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });

  await publicarPagina(user.id, page.id, parsed.data.publicar);
  // Publicar é o último passo do onboarding — chegou aqui, terminou.
  if (parsed.data.publicar && !user.onboarded) await marcarOnboardingConcluido(user.id);

  return NextResponse.json({ ok: true, slug: page.slug, publicada: parsed.data.publicar });
}
