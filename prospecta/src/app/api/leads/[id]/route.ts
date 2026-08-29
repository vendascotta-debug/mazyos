import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { deleteLead, updateLead } from "@/lib/repo";
import { STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  stage: z.enum(STAGES).optional(),
  note: z.string().max(2000).nullish(),
  estimatedValue: z.number().nonnegative().nullish(),
  nextActionAt: z.string().nullish(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  const lead = await updateLead(user.id, id, parsed.data);
  if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { id } = await ctx.params;
  await deleteLead(user.id, id);
  return NextResponse.json({ ok: true });
}
