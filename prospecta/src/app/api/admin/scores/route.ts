import { NextResponse } from "next/server";
import { atualizarScores, scoresPendentes } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Recalcula o score gravado das empresas (`companies.rank_*`).
 *
 * Rodar depois de: importar a base da Receita, ou subir SCORE_VERSION.
 * Cada chamada trabalha ~45 s e devolve quantas faltam — repita até `pendentes: 0`.
 *
 *   curl -X POST https://SEU-APP/api/admin/scores -H "x-seed-token: SEU_TOKEN"
 *
 * Protegido por `SEED_TOKEN`; em produção, sem a variável, recusa.
 */
function autorizado(req: Request): boolean {
  const token = process.env.SEED_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-seed-token") === token;
}

export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  return NextResponse.json({ pendentes: await scoresPendentes() });
}

export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  const inicio = Date.now();
  let atualizadas = 0;
  try {
    while (Date.now() - inicio < 45_000) {
      const n = await atualizarScores({ limite: 2000, lote: 1000 });
      atualizadas += n;
      if (n === 0) break;
    }
    return NextResponse.json({ atualizadas, pendentes: await scoresPendentes(), segundos: Math.round((Date.now() - inicio) / 1000) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, atualizadas }, { status: 500 });
  }
}
