import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { addToList, deleteList, removeFromList } from "@/lib/repo";

export const dynamic = "force-dynamic";

const ItemSchema = z.object({ leadId: z.string().min(1) });

/** POST adiciona um lead à lista; DELETE remove o lead ou (sem body) a lista. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = ItemSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  await addToList(user.id, id, parsed.data.leadId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { id } = await ctx.params;
  const leadId = new URL(req.url).searchParams.get("leadId");
  if (leadId) await removeFromList(user.id, id, leadId);
  else await deleteList(user.id, id);
  return NextResponse.json({ ok: true });
}
