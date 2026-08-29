import { NextResponse } from "next/server";
import { dbSchema, ensureSchema, q1 } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";
// A carga leva alguns segundos contra o Supabase; o default de 10s não basta.
export const maxDuration = 60;

/** GET: diagnóstico — schema ok? quantas linhas tem? */
export async function GET() {
  try {
    await ensureSchema();
    const [companies, leads, lists] = await Promise.all([
      q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM companies"),
      q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM leads"),
      q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM lead_lists"),
    ]);
    return NextResponse.json({
      ok: true,
      schema: dbSchema(),
      tabelas: "prontas",
      companies: companies?.n ?? 0,
      leads: leads?.n ?? 0,
      lists: lists?.n ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

/**
 * POST: cria o schema e carrega a base de demonstração.
 *
 * Protegido por `SEED_TOKEN` (header `x-seed-token`), porque é um endpoint que
 * escreve em produção. Sem a variável definida, só roda fora de produção.
 */
export async function POST(req: Request) {
  const token = process.env.SEED_TOKEN;
  if (token) {
    if (req.headers.get("x-seed-token") !== token) {
      return NextResponse.json({ error: "não autorizado" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "defina SEED_TOKEN nas variáveis de ambiente para rodar o seed em produção" },
      { status: 403 },
    );
  }

  try {
    await ensureSchema();
    // `?completar=1` reexecuta a carga por cima de uma base já populada. As
    // inserções são ON CONFLICT DO NOTHING, então empresas existentes (e os
    // leads salvos que apontam para elas) não são tocadas — só entra o que
    // falta, como um segmento novo.
    const completar = new URL(req.url).searchParams.get("completar") === "1";
    const existing = await q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM companies");
    if ((existing?.n ?? 0) > 0 && !completar) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: `Base já tem ${existing?.n} empresas — nada a fazer. Use ?completar=1 para inserir o que falta.`,
      });
    }
    const result = await seedDatabase();
    return NextResponse.json({ ok: true, schema: dbSchema(), ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
