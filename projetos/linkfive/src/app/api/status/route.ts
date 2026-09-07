import { NextResponse } from "next/server";
import { dbSchema, ensureSchema, q } from "@/lib/db";

/**
 * Diagnóstico de banco. Diz se a conexão funciona, em qual schema o LINKFIVE
 * está gravando e quantas linhas existem em cada tabela.
 *
 * Não expõe nada sensível: só nome de tabela e contagem.
 */
export async function GET() {
  try {
    await ensureSchema();
    const tabelas = ["users", "pages", "links", "page_views", "link_clicks", "daily_stats", "leads"];
    const contagem: Record<string, number> = {};
    for (const t of tabelas) {
      const r = await q<{ n: string }>(`SELECT COUNT(*) AS n FROM ${t}`);
      contagem[t] = Number(r[0]?.n ?? 0);
    }
    return NextResponse.json({ ok: true, schema: dbSchema(), contagem });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
