import { NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Pedidos de titulares recebidos (LGPD). A LGPD dá 15 dias para responder.
 *   GET  → lista os pedidos (mais recentes primeiro)
 *   POST { id, status } → marca como "respondido" / "recusado"
 * Protegido por SEED_TOKEN (header x-seed-token).
 */
function autorizado(req: Request): boolean {
  const token = process.env.SEED_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-seed-token") === token;
}

export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  const pedidos = await q(
    `SELECT id, kind, name, email, cnpj, message, status, created_at::text AS created_at,
            (created_at + interval '15 days')::date::text AS prazo
     FROM privacy_requests ORDER BY created_at DESC LIMIT 200`,
  );
  return NextResponse.json({ pedidos });
}

const Atualiza = z.object({ id: z.string().min(1), status: z.enum(["recebido", "respondido", "recusado"]) });

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  const parsed = Atualiza.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  await q("UPDATE privacy_requests SET status = ? WHERE id = ?", [parsed.data.status, parsed.data.id]);
  return NextResponse.json({ ok: true });
}
