import type { Company, DecisionMaker, LeadScore, ScoreTier } from "@/lib/types";
import { getSegment, getSubsegment } from "@/lib/segments";

export function tierOf(total: number): ScoreTier {
  if (total >= 75) return "A";
  if (total >= 55) return "B";
  if (total >= 35) return "C";
  return "D";
}

export const TIER_LABEL: Record<ScoreTier, string> = {
  A: "Prioridade máxima",
  B: "Bom potencial",
  C: "Potencial médio",
  D: "Baixa prioridade",
};

/**
 * Calcula o Lead Score usando os fatores declarados pelo segmento.
 * A escala é sempre 0-100, independente de quantos fatores o segmento define
 * (normalizamos pelo total de pontos possíveis), o que mantém o CRM e os
 * relatórios comparáveis entre mercados.
 */
export function calcularScore(
  company: Company,
  decisionMakers: DecisionMaker[],
  employeesEstimate: number,
): LeadScore {
  const segment = getSegment(company.segmentSlug);
  const subsegment = getSubsegment(company.segmentSlug, company.subsegmentSlug);
  const named = decisionMakers.filter((d) => d.name && !d.inferred);

  const ctx = {
    company,
    subsegment,
    namedDecisionMakers: named.length,
    bestRoleCategory: decisionMakers[0]?.roleCategory ?? null,
    employeesEstimate,
  };

  const factors = segment.scoreFactors.map((rule) => {
    const r = rule.evaluate(ctx);
    return {
      key: rule.key,
      label: rule.label,
      maxPoints: rule.maxPoints,
      points: Math.max(0, Math.min(rule.maxPoints, r.points)),
      detail: r.detail,
    };
  });

  const max = factors.reduce((a, f) => a + f.maxPoints, 0) || 1;
  const raw = factors.reduce((a, f) => a + f.points, 0);
  const total = Math.round((raw / max) * 100);

  const forte = [...factors].sort((a, b) => b.points / b.maxPoints - a.points / a.maxPoints)[0];
  const fraco = [...factors].sort((a, b) => a.points / a.maxPoints - b.points / b.maxPoints)[0];

  return {
    total,
    tier: tierOf(total),
    factors,
    summary:
      named.length > 0
        ? `${forte.label.toLowerCase()} favorável e decisor identificado (${named[0].name}).`
        : `${forte.label.toLowerCase()} favorável, mas ${fraco.label.toLowerCase()} pesa contra.`,
  };
}
