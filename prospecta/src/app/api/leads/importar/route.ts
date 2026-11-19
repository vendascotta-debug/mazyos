import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { importarLeads } from "@/lib/importacao";
import { getList } from "@/lib/repo";

export const dynamic = "force-dynamic";
// Lote grande de planilha pode passar do limite padrão de 10 s da Vercel.
export const maxDuration = 60;

const texto = (max: number) =>
  z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v == null ? null : String(v).trim().slice(0, max) || null));

const Linha = z.object({
  nome: z.union([z.string(), z.number()]).transform((v) => String(v).trim().slice(0, 200)),
  cnpj: texto(30),
  telefone: texto(40),
  whatsapp: texto(40),
  email: texto(200),
  site: texto(300),
  instagram: texto(300),
  linkedin: texto(300),
  cidade: texto(100),
  uf: texto(2),
  bairro: texto(100),
  endereco: texto(300),
  decisor: texto(150),
  cargoDecisor: texto(100),
  emailDecisor: texto(200),
  telefoneDecisor: texto(40),
  linkedinDecisor: texto(300),
  observacao: texto(2000),
});

/** Até 200 linhas por chamada: a tela manda planilhas maiores em lotes. */
const Schema = z.object({
  segmento: z.string().min(1),
  subsegmento: z.string().min(1),
  listaId: z.string().nullish(),
  linhas: z.array(Linha).min(1).max(200),
});

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }

  const { linhas, segmento, subsegmento, listaId } = parsed.data;
  if (listaId && !(await getList(user.id, listaId))) {
    return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });
  }

  try {
    const resultados = await importarLeads(user.id, linhas, { segmento, subsegmento, listaId: listaId ?? null });
    return NextResponse.json({ resultados });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
