import { DEFAULT_SEGMENT, getSegment } from "@/lib/segments";
import type { Porte, SearchFilters } from "@/lib/types";

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

const many = (v: string | string[] | undefined): string[] => {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);
};

const num = (v: string | null, fallback: number | null): number | null => {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const PORTES: Porte[] = ["MEI", "ME", "EPP", "DEMAIS"];

/** Traduz a query string da URL nos filtros de busca (a URL é o estado). */
export function parseFilters(params: RawParams): SearchFilters {
  const segmentSlug = first(params.segment) ?? DEFAULT_SEGMENT;
  const segment = getSegment(segmentSlug);
  const validSubs = new Set(segment.subsegments.map((s) => s.slug));

  return {
    segment: segment.slug,
    subsegments: many(params.sub).filter((s) => validSubs.has(s)),
    city: first(params.city),
    uf: first(params.uf),
    neighborhood: first(params.bairro),
    radiusKm: num(first(params.raio), null),
    centerLat: num(first(params.lat), null),
    centerLng: num(first(params.lng), null),
    query: first(params.q),
    minScore: num(first(params.score), 0) ?? 0,
    onlyWithDecisionMaker: first(params.decisor) === "1",
    onlyWithPhone: first(params.fone) === "1",
    hideSaved: first(params.novos) === "1",
    allSegments: first(params.tudo) === "1",
    porte: many(params.porte).filter((p): p is Porte => PORTES.includes(p as Porte)),
    sort: (first(params.ordem) as SearchFilters["sort"]) ?? "score",
    page: Math.max(1, num(first(params.pagina), 1) ?? 1),
    pageSize: 12,
  };
}

/** Serializa filtros de volta pra query string, omitindo o que é default. */
export function toQuery(f: Partial<SearchFilters> & { segment: string }): string {
  const p = new URLSearchParams();
  if (f.segment) p.set("segment", f.segment);
  if (f.subsegments?.length) p.set("sub", f.subsegments.join(","));
  if (f.city) p.set("city", f.city);
  if (f.neighborhood) p.set("bairro", f.neighborhood);
  if (f.radiusKm) p.set("raio", String(f.radiusKm));
  if (f.query) p.set("q", f.query);
  if (f.minScore) p.set("score", String(f.minScore));
  if (f.onlyWithDecisionMaker) p.set("decisor", "1");
  if (f.onlyWithPhone) p.set("fone", "1");
  if (f.hideSaved) p.set("novos", "1");
  if (f.allSegments) p.set("tudo", "1");
  if (f.porte?.length) p.set("porte", f.porte.join(","));
  if (f.sort && f.sort !== "score") p.set("ordem", f.sort);
  if (f.page && f.page > 1) p.set("pagina", String(f.page));
  return p.toString();
}
