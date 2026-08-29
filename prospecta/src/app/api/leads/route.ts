import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { listLeads, saveLead } from "@/lib/repo";
import type { Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const SaveSchema = z.object({
  companyId: z.string().min(1),
  listId: z.string().nullish(),
  note: z.string().max(2000).nullish(),
});

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const parsed = SaveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const lead = await saveLead(user.id, parsed.data.companyId, {
      listId: parsed.data.listId ?? null,
      note: parsed.data.note ?? null,
    });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const url = new URL(req.url);
  const leads = await listLeads(user.id, {
    segment: url.searchParams.get("segment") ?? undefined,
    stage: (url.searchParams.get("stage") as Stage | null) ?? null,
    listId: url.searchParams.get("listId"),
    query: url.searchParams.get("q"),
  });
  return NextResponse.json({ leads });
}
