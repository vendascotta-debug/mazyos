import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { createList, listLists } from "@/lib/repo";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  segment: z.string().min(1),
});

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const url = new URL(req.url);
  return NextResponse.json({ lists: await listLists(user.id, url.searchParams.get("segment") ?? undefined) });
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }
  const list = await createList(user.id, parsed.data.name, parsed.data.description ?? null, parsed.data.segment);
  return NextResponse.json({ list }, { status: 201 });
}
