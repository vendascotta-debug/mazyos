import { NextResponse } from "next/server";
import { z } from "zod";
import { q } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { aprovarRemocao, desfazerRemocao } from "@/lib/privacidade";

export const dynamic = "force-dynamic";

/**
 * Pedidos de titulares (LGPD). Prazo de resposta: 15 dias.
 *   GET  → lista os pedidos
 *   POST { id, acao } → aprovar (remoção passa a valer) | respondido | recusar | desfazer
 * Acesso: admin logado (ADMIN_EMAILS) ou header x-seed-token.
 */
async function autorizado(req: Request): Promise<boolean> {
  const token = process.env.SEED_TOKEN;
  if (token && req.headers.get("x-seed-token") === token) return true;
  return isAdmin(await apiUser());
}

export async function GET(req: Request) {
  if (!(await autorizado(req))) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const pedidos = await q(
    `SELECT id, kind, name, email, cnpj, message, status, created_at::text AS created_at,
            (created_at + interval '15 days')::date::text AS prazo
     FROM privacy_requests ORDER BY created_at DESC LIMIT 200`,
  );
  return NextResponse.json({ pedidos });
}

const Acao = z.object({
  id: z.string().min(1),
  acao: z.enum(["aprovar", "respondido", "recusar", "desfazer"]),
});

export async function POST(req: Request) {
  if (!(await autorizado(req))) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const parsed = Acao.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { id, acao } = parsed.data;

  if (acao === "aprovar") {
    const r = await aprovarRemocao(id);
    return NextResponse.json(r, { status: r.ok ? 200 : 404 });
  }
  if (acao === "desfazer") {
    await desfazerRemocao(id);
    return NextResponse.json({ ok: true });
  }
  await q("UPDATE privacy_requests SET status = ? WHERE id = ?", [acao === "recusar" ? "recusado" : "respondido", id]);
  return NextResponse.json({ ok: true });
}
