import { apiUser } from "@/lib/auth";
import { listLeads } from "@/lib/repo";
import { bestDecisionMaker } from "@/lib/decisores";
import type { Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Exporta os leads (opcionalmente de uma lista/etapa) em CSV pronto pra discagem. */
export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return new Response("Faça login.", { status: 401 });

  const url = new URL(req.url);
  const leads = await listLeads(user.id, {
    segment: url.searchParams.get("segment") ?? undefined,
    listId: url.searchParams.get("listId"),
    stage: (url.searchParams.get("stage") as Stage | null) ?? null,
  });

  const header = [
    "empresa", "razao_social", "cnpj", "subsegmento", "bairro", "cidade", "uf",
    "telefone", "whatsapp", "email", "site", "instagram", "linkedin_empresa",
    "decisor", "cargo_decisor", "confianca_decisor", "linkedin_decisor", "fonte_decisor",
    "score", "classe", "etapa", "potencial_mensal", "listas",
  ];

  const rows = leads.map((l) => {
    const d = bestDecisionMaker(l.decisionMakers);
    return [
      l.company.name, l.company.legalName, l.company.cnpj, l.company.subsegmentSlug,
      l.company.neighborhood, l.company.city, l.company.uf,
      l.company.phone, l.company.whatsapp, l.company.email, l.company.website, l.company.instagram, l.company.linkedin,
      d?.name ?? (d ? `(cargo provável: ${d.role})` : ""), d?.role ?? "", d?.confidence ?? "",
      d?.linkedin ?? "", d?.source ?? "",
      l.score, l.tier, l.stage, l.estimatedValue ?? "", l.lists.map((x) => x.name).join(" | "),
    ];
  });

  // Separador ";" e BOM: abre certo no Excel em português sem etapa extra.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="prospecta-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
