import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { atualizarLink, excluirLink, linkDoDono } from "@/lib/repo";
import { montarUrl } from "@/lib/links";

const Corpo = z.object({
  title: z.string().trim().min(1).optional(),
  url: z.string().trim().optional(),
  icon: z.string().trim().nullish(),
  active: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const atual = await linkDoDono(user.id, id);
  if (!atual) return NextResponse.json({ erro: "Link não encontrado." }, { status: 404 });

  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }

  // Mudou número ou entrada? A URL precisa ser remontada, senão o botão
  // continua apontando pro valor antigo.
  const config = (parsed.data.config ?? atual.config) as typeof atual.config;
  const precisaRemontar = parsed.data.url !== undefined || parsed.data.config !== undefined;
  const url = precisaRemontar
    ? montarUrl(atual.type, parsed.data.url ?? "", config)
    : undefined;

  const link = await atualizarLink(user.id, id, { ...parsed.data, config, url });
  return NextResponse.json({ link });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const ok = await excluirLink(user.id, id);
  if (!ok) return NextResponse.json({ erro: "Link não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
