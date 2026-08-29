import { nowIso, q, q1, uid } from "@/lib/db";
import { derivarDecisores, type PublicRecords } from "@/lib/decisores";
import { calcularScore } from "@/lib/scoring";
import { getSegment } from "@/lib/segments";
import {
  STAGES,
  type Activity,
  type Company,
  type CompanyResult,
  type DecisionMaker,
  type Lead,
  type LeadList,
  type LeadWithCompany,
  type SearchFilters,
  type Stage,
  type UF,
} from "@/lib/types";

type Row = Record<string, unknown>;

const parseJson = <T,>(v: unknown, fallback: T): T => {
  if (typeof v !== "string" || !v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};

/** Postgres devolve numeric/int8 como string em alguns agregados. */
const toNum = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0));

function toCompany(row: Row): Company {
  return {
    id: row.id as string,
    segmentSlug: row.segment_slug as string,
    subsegmentSlug: row.subsegment_slug as string,
    name: row.name as string,
    legalName: row.legal_name as string,
    cnpj: (row.cnpj as string) ?? null,
    street: (row.street as string) ?? "",
    number: (row.number as string) ?? "",
    neighborhood: (row.neighborhood as string) ?? "",
    city: (row.city as string) ?? "",
    uf: (row.uf as UF) ?? ("SP" as UF),
    zip: (row.zip as string) ?? null,
    lat: toNum(row.lat),
    lng: toNum(row.lng),
    phone: (row.phone as string) ?? null,
    whatsapp: (row.whatsapp as string) ?? null,
    email: (row.email as string) ?? null,
    website: (row.website as string) ?? null,
    instagram: (row.instagram as string) ?? null,
    linkedin: (row.linkedin as string) ?? null,
    rating: row.rating == null ? null : toNum(row.rating),
    reviewsCount: row.reviews_count == null ? null : toNum(row.reviews_count),
    priceLevel: (row.price_level as Company["priceLevel"]) ?? null,
    employeesRange: (row.employees_range as string) ?? null,
    unitsCount: toNum(row.units_count) || 1,
    openedAt: (row.opened_at as string) ?? null,
    capitalSocial: row.capital_social == null ? null : toNum(row.capital_social),
    porte: (row.porte as Company["porte"]) ?? null,
    situacao: (row.situacao as Company["situacao"]) ?? null,
    cnaePrincipal: (row.cnae_principal as string) ?? null,
    cnaePrincipalDesc: (row.cnae_principal_desc as string) ?? null,
    cnaeSecundarios: parseJson<string[]>(row.cnae_secundarios, []),
    deliveryApps: parseJson<string[]>(row.delivery_apps, []),
    hours: (row.hours as string) ?? null,
    sources: parseJson<Company["sources"]>(row.sources, []),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function publicRecordsOf(row: Row): PublicRecords {
  return parseJson<PublicRecords>(row.public_records, { qsa: [], mentions: [], employeesEstimate: 5 });
}

/** Company + decisores + score, o pacote que quase toda tela consome. */
export function enrich(row: Row): {
  company: Company;
  decisionMakers: DecisionMaker[];
  score: ReturnType<typeof calcularScore>;
  records: PublicRecords;
} {
  const company = toCompany(row);
  const records = publicRecordsOf(row);
  const decisionMakers = derivarDecisores(company, records);
  const score = calcularScore(company, decisionMakers, records.employeesEstimate);
  return { company, decisionMakers, score, records };
}

// --- Geo -------------------------------------------------------------------

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// --- Catálogo de localidades ----------------------------------------------

export async function listCities(segment: string): Promise<{ city: string; uf: string; count: number }[]> {
  const rows = await q<{ city: string; uf: string; count: number }>(
    `SELECT city, uf, COUNT(*)::int AS count FROM companies
     WHERE segment_slug = ? GROUP BY city, uf ORDER BY count DESC`,
    [segment],
  );
  return rows;
}

export async function listNeighborhoods(
  segment: string,
  city: string | null,
): Promise<{ neighborhood: string; count: number }[]> {
  if (!city) return [];
  return q<{ neighborhood: string; count: number }>(
    `SELECT neighborhood, COUNT(*)::int AS count FROM companies
     WHERE segment_slug = ? AND city = ? GROUP BY neighborhood ORDER BY neighborhood`,
    [segment, city],
  );
}

/** Centro geográfico do recorte atual — origem do filtro de raio. */
export async function centerOf(
  segment: string,
  city: string | null,
  neighborhood: string | null,
): Promise<{ lat: number; lng: number } | null> {
  const params: unknown[] = [segment];
  let sql = "SELECT AVG(lat)::float8 AS lat, AVG(lng)::float8 AS lng FROM companies WHERE segment_slug = ?";
  if (city) { sql += " AND city = ?"; params.push(city); }
  if (neighborhood) { sql += " AND neighborhood = ?"; params.push(neighborhood); }
  const row = await q1<{ lat: number | null; lng: number | null }>(sql, params);
  if (row?.lat == null || row?.lng == null) return null;
  return { lat: toNum(row.lat), lng: toNum(row.lng) };
}

// --- Busca -----------------------------------------------------------------

export interface SearchOutcome {
  results: CompanyResult[];
  total: number;
  center: { lat: number; lng: number } | null;
  /** Todos os pontos do recorte (sem paginar), pro mapa não “sumir” página a página. */
  mapPoints: { id: string; name: string; lat: number; lng: number; score: number; tier: string; saved: boolean }[];
  facets: { subsegments: { slug: string; name: string; count: number }[] };
}

export async function searchCompanies(f: SearchFilters, userId: string): Promise<SearchOutcome> {
  const segment = getSegment(f.segment);

  const where: string[] = ["c.segment_slug = ?"];
  const params: unknown[] = [f.segment];

  if (f.subsegments.length) {
    where.push(`c.subsegment_slug IN (${f.subsegments.map(() => "?").join(",")})`);
    params.push(...f.subsegments);
  }
  if (f.city) { where.push("c.city = ?"); params.push(f.city); }
  if (f.uf) { where.push("c.uf = ?"); params.push(f.uf); }
  if (f.neighborhood) { where.push("c.neighborhood = ?"); params.push(f.neighborhood); }
  if (f.query) {
    where.push("(LOWER(c.name) LIKE ? OR LOWER(c.legal_name) LIKE ? OR c.cnpj LIKE ?)");
    const term = `%${f.query.toLowerCase()}%`;
    params.push(term, term, `%${f.query}%`);
  }
  if (f.onlyWithPhone) where.push("(c.phone IS NOT NULL OR c.whatsapp IS NOT NULL)");

  if (f.porte.length) {
    where.push(`c.porte IN (${f.porte.map(() => "?").join(",")})`);
    params.push(...f.porte);
  }

  const [rows, center] = await Promise.all([
    q<Row>(
      // O LEFT JOIN é escopado ao usuário: "já salvei essa empresa?" é uma
      // pergunta pessoal — o lead do vizinho não pode aparecer aqui.
      `SELECT c.*, l.id AS lead_id, l.stage AS lead_stage
       FROM companies c
       LEFT JOIN leads l ON l.company_id = c.id AND l.user_id = ?
       WHERE ${where.join(" AND ")}`,
      [userId, ...params],
    ),
    f.centerLat != null && f.centerLng != null
      ? Promise.resolve({ lat: f.centerLat, lng: f.centerLng })
      : centerOf(f.segment, f.city, f.neighborhood),
  ]);

  // Score e decisores são derivados (dependem do motor, não do banco), então
  // filtros que dependem deles rodam em memória, depois do recorte SQL.
  let enriched: CompanyResult[] = rows.map((row) => {
    const { company, decisionMakers, score } = enrich(row);
    const distanceKm = center ? haversineKm(center.lat, center.lng, company.lat, company.lng) : null;
    return {
      company,
      score,
      decisionMakers,
      distanceKm: distanceKm == null ? null : Math.round(distanceKm * 100) / 100,
      savedLeadId: (row.lead_id as string) ?? null,
      savedStage: (row.lead_stage as Stage) ?? null,
    };
  });

  if (f.radiusKm != null && center) {
    enriched = enriched.filter((e) => e.distanceKm != null && e.distanceKm <= f.radiusKm!);
  }
  if (f.minScore > 0) enriched = enriched.filter((e) => e.score.total >= f.minScore);
  if (f.onlyWithDecisionMaker) {
    enriched = enriched.filter((e) => e.decisionMakers.some((d) => d.name && !d.inferred));
  }
  if (f.hideSaved) enriched = enriched.filter((e) => !e.savedLeadId);

  const facetMap = new Map<string, number>();
  for (const e of enriched) {
    facetMap.set(e.company.subsegmentSlug, (facetMap.get(e.company.subsegmentSlug) ?? 0) + 1);
  }
  const facets = {
    subsegments: segment.subsegments
      .map((s) => ({ slug: s.slug, name: s.name, count: facetMap.get(s.slug) ?? 0 }))
      .filter((s) => s.count > 0 || f.subsegments.includes(s.slug)),
  };

  const sorters: Record<SearchFilters["sort"], (a: CompanyResult, b: CompanyResult) => number> = {
    score: (a, b) => b.score.total - a.score.total,
    name: (a, b) => a.company.name.localeCompare(b.company.name, "pt-BR"),
    reviews: (a, b) => (b.company.reviewsCount ?? 0) - (a.company.reviewsCount ?? 0),
    distance: (a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9),
    recent: (a, b) => (b.company.openedAt ?? "").localeCompare(a.company.openedAt ?? ""),
  };
  enriched.sort(sorters[f.sort] ?? sorters.score);

  const mapPoints = enriched.slice(0, 400).map((e) => ({
    id: e.company.id,
    name: e.company.name,
    lat: e.company.lat,
    lng: e.company.lng,
    score: e.score.total,
    tier: e.score.tier,
    saved: !!e.savedLeadId,
  }));

  const total = enriched.length;
  const start = (f.page - 1) * f.pageSize;
  return { results: enriched.slice(start, start + f.pageSize), total, center, mapPoints, facets };
}

export async function getCompany(id: string, userId: string) {
  const row = await q1<Row>("SELECT * FROM companies WHERE id = ?", [id]);
  if (!row) return null;
  const data = enrich(row);
  const lead = await q1<Row>("SELECT * FROM leads WHERE company_id = ? AND user_id = ?", [id, userId]);
  return { ...data, lead: lead ? toLead(lead) : null };
}

/** Outras unidades da mesma marca na base — sinal de rede. */
export async function siblingUnits(company: Company): Promise<Company[]> {
  const rows = await q<Row>(
    "SELECT * FROM companies WHERE segment_slug = ? AND name = ? AND id <> ? LIMIT 8",
    [company.segmentSlug, company.name, company.id],
  );
  return rows.map(toCompany);
}

// --- Leads -----------------------------------------------------------------

function toLead(row: Row): Lead {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    stage: row.stage as Stage,
    score: toNum(row.score),
    tier: row.tier as Lead["tier"],
    note: (row.note as string) ?? null,
    estimatedValue: row.estimated_value == null ? null : toNum(row.estimated_value),
    ownerName: (row.owner_name as string) ?? null,
    lastContactAt: (row.last_contact_at as string) ?? null,
    nextActionAt: (row.next_action_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function logActivity(leadId: string, type: Activity["type"], message: string) {
  await q("INSERT INTO activities (id, lead_id, type, message, created_at) VALUES (?,?,?,?,?)", [
    uid("act-"),
    leadId,
    type,
    message,
    nowIso(),
  ]);
}

export async function saveLead(
  userId: string,
  companyId: string,
  opts: { listId?: string | null; note?: string | null } = {},
): Promise<Lead> {
  const existing = await q1<Row>("SELECT * FROM leads WHERE company_id = ? AND user_id = ?", [companyId, userId]);
  if (existing) {
    const lead = toLead(existing);
    if (opts.listId) await addToList(userId, opts.listId, lead.id);
    return lead;
  }

  const data = await getCompany(companyId, userId);
  if (!data) throw new Error("Empresa não encontrada");
  const segment = getSegment(data.company.segmentSlug);
  const id = uid("lead-");
  const now = nowIso();

  // ON CONFLICT: duas abas salvando a mesma empresa não podem virar erro 500.
  await q(
    `INSERT INTO leads (id, user_id, company_id, stage, score, tier, note, estimated_value, owner_name, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT (user_id, company_id) DO NOTHING`,
    [id, userId, companyId, "novo", data.score.total, data.score.tier, opts.note ?? null,
     segment.estimateValue(data.company), null, now, now],
  );

  const saved = await q1<Row>("SELECT * FROM leads WHERE company_id = ? AND user_id = ?", [companyId, userId]);
  const lead = toLead(saved!);
  if (lead.id === id) {
    await logActivity(id, "criado", `Lead salvo a partir da busca — score ${data.score.total} (${data.score.tier}).`);
  }
  if (opts.listId) await addToList(userId, opts.listId, lead.id);
  return lead;
}

export async function deleteLead(userId: string, leadId: string) {
  await q("DELETE FROM leads WHERE id = ? AND user_id = ?", [leadId, userId]);
}

export async function updateLead(
  userId: string,
  leadId: string,
  patch: { stage?: Stage; note?: string | null; estimatedValue?: number | null; nextActionAt?: string | null },
): Promise<Lead | null> {
  // O filtro por user_id aqui é o que impede alterar lead de outra conta.
  const before = await q1<Row>("SELECT * FROM leads WHERE id = ? AND user_id = ?", [leadId, userId]);
  if (!before) return null;
  const prev = toLead(before);

  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.stage && patch.stage !== prev.stage) {
    if (!STAGES.includes(patch.stage)) throw new Error("Etapa inválida");
    sets.push("stage = ?"); params.push(patch.stage);
    if (patch.stage !== "novo") { sets.push("last_contact_at = ?"); params.push(nowIso()); }
  }
  if (patch.note !== undefined) { sets.push("note = ?"); params.push(patch.note); }
  if (patch.estimatedValue !== undefined) { sets.push("estimated_value = ?"); params.push(patch.estimatedValue); }
  if (patch.nextActionAt !== undefined) { sets.push("next_action_at = ?"); params.push(patch.nextActionAt); }
  if (!sets.length) return prev;

  sets.push("updated_at = ?"); params.push(nowIso());
  params.push(leadId, userId);
  await q(`UPDATE leads SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, params);

  if (patch.stage && patch.stage !== prev.stage) {
    await logActivity(leadId, "etapa", `Etapa alterada: ${prev.stage} → ${patch.stage}.`);
  }
  if (patch.note !== undefined && patch.note && patch.note !== prev.note) {
    await logActivity(leadId, "nota", patch.note);
  }
  if (patch.estimatedValue !== undefined && patch.estimatedValue !== prev.estimatedValue) {
    await logActivity(
      leadId,
      "valor",
      `Potencial mensal ajustado para R$ ${(patch.estimatedValue ?? 0).toLocaleString("pt-BR")}.`,
    );
  }
  const after = await q1<Row>("SELECT * FROM leads WHERE id = ?", [leadId]);
  return after ? toLead(after) : null;
}

export async function listLeads(
  userId: string,
  opts: { segment?: string; stage?: Stage | null; listId?: string | null; query?: string | null } = {},
): Promise<LeadWithCompany[]> {
  const where: string[] = ["l.user_id = ?"];
  const params: unknown[] = [];
  if (opts.listId) params.push(opts.listId); // entra no JOIN, antes do WHERE
  params.push(userId); // primeiro item do WHERE
  if (opts.segment) { where.push("c.segment_slug = ?"); params.push(opts.segment); }
  if (opts.stage) { where.push("l.stage = ?"); params.push(opts.stage); }
  if (opts.query) { where.push("LOWER(c.name) LIKE ?"); params.push(`%${opts.query.toLowerCase()}%`); }

  // Colunas do lead vêm com prefixo: `c.*` e `l.*` colidem em id/created_at.
  let sql = `SELECT c.*,
      l.id AS lead_id, l.stage AS lead_stage, l.score AS lead_score, l.tier AS lead_tier,
      l.note AS lead_note, l.estimated_value AS lead_value, l.owner_name AS lead_owner,
      l.last_contact_at AS lead_last, l.next_action_at AS lead_next,
      l.created_at AS lead_created, l.updated_at AS lead_updated
    FROM leads l JOIN companies c ON c.id = l.company_id`;
  if (opts.listId) sql += " JOIN lead_list_items li ON li.lead_id = l.id AND li.list_id = ?";
  sql += ` WHERE ${where.join(" AND ")} ORDER BY l.score DESC, l.updated_at DESC`;

  const rows = await q<Row>(sql, params);
  if (!rows.length) return [];

  // Uma query só para as listas de todos os leads — evita N+1.
  const ids = rows.map((r) => r.lead_id as string);
  const listRows = await q<{ lead_id: string; id: string; name: string }>(
    `SELECT li.lead_id, ll.id, ll.name FROM lead_list_items li
     JOIN lead_lists ll ON ll.id = li.list_id
     WHERE li.lead_id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  const byLead = new Map<string, { id: string; name: string }[]>();
  for (const r of listRows) {
    const arr = byLead.get(r.lead_id) ?? [];
    arr.push({ id: r.id, name: r.name });
    byLead.set(r.lead_id, arr);
  }

  return rows.map((row) => {
    const leadId = row.lead_id as string;
    const { company, decisionMakers } = enrich(row);
    return {
      id: leadId,
      companyId: company.id,
      stage: row.lead_stage as Stage,
      score: toNum(row.lead_score),
      tier: row.lead_tier as Lead["tier"],
      note: (row.lead_note as string) ?? null,
      estimatedValue: row.lead_value == null ? null : toNum(row.lead_value),
      ownerName: (row.lead_owner as string) ?? null,
      lastContactAt: (row.lead_last as string) ?? null,
      nextActionAt: (row.lead_next as string) ?? null,
      createdAt: row.lead_created as string,
      updatedAt: row.lead_updated as string,
      company,
      decisionMakers,
      lists: byLead.get(leadId) ?? [],
    };
  });
}

export async function getLeadActivities(userId: string, leadId: string): Promise<Activity[]> {
  // Histórico é dado sensível de negociação: só o dono do lead enxerga.
  const dono = await q1<{ id: string }>("SELECT id FROM leads WHERE id = ? AND user_id = ?", [leadId, userId]);
  if (!dono) return [];
  const rows = await q<Row>("SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC", [leadId]);
  return rows.map((r) => ({
    id: r.id as string,
    leadId: r.lead_id as string,
    type: r.type as Activity["type"],
    message: r.message as string,
    createdAt: r.created_at as string,
  }));
}

// --- Listas ----------------------------------------------------------------

export async function listLists(userId: string, segment?: string): Promise<LeadList[]> {
  const rows = segment
    ? await q<Row>(
        `SELECT ll.*, COUNT(li.lead_id)::int AS lead_count
         FROM lead_lists ll LEFT JOIN lead_list_items li ON li.list_id = ll.id
         WHERE ll.user_id = ? AND ll.segment_slug = ? GROUP BY ll.id ORDER BY ll.created_at DESC`,
        [userId, segment],
      )
    : await q<Row>(
        `SELECT ll.*, COUNT(li.lead_id)::int AS lead_count
         FROM lead_lists ll LEFT JOIN lead_list_items li ON li.list_id = ll.id
         WHERE ll.user_id = ? GROUP BY ll.id ORDER BY ll.created_at DESC`,
        [userId],
      );

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    segmentSlug: r.segment_slug as string,
    createdAt: r.created_at as string,
    leadCount: toNum(r.lead_count),
  }));
}

export async function createList(
  userId: string,
  name: string,
  description: string | null,
  segmentSlug: string,
): Promise<LeadList> {
  const id = uid("lst-");
  const createdAt = nowIso();
  await q("INSERT INTO lead_lists (id, user_id, name, description, segment_slug, created_at) VALUES (?,?,?,?,?,?)", [
    id, userId, name, description, segmentSlug, createdAt,
  ]);
  return { id, name, description, segmentSlug, createdAt, leadCount: 0 };
}

export async function deleteList(userId: string, id: string) {
  await q("DELETE FROM lead_lists WHERE id = ? AND user_id = ?", [id, userId]);
}

export async function addToList(userId: string, listId: string, leadId: string) {
  // Só liga lista e lead se ambos forem da mesma conta.
  const list = await q1<{ name: string }>("SELECT name FROM lead_lists WHERE id = ? AND user_id = ?", [listId, userId]);
  const lead = await q1<{ id: string }>("SELECT id FROM leads WHERE id = ? AND user_id = ?", [leadId, userId]);
  if (!list || !lead) return;

  await q(
    "INSERT INTO lead_list_items (list_id, lead_id, added_at) VALUES (?,?,?) ON CONFLICT DO NOTHING",
    [listId, leadId, nowIso()],
  );
  await logActivity(leadId, "lista", `Adicionado à lista "${list.name}".`);
}

export async function removeFromList(userId: string, listId: string, leadId: string) {
  const list = await q1<{ id: string }>("SELECT id FROM lead_lists WHERE id = ? AND user_id = ?", [listId, userId]);
  if (!list) return;
  await q("DELETE FROM lead_list_items WHERE list_id = ? AND lead_id = ?", [listId, leadId]);
}

export async function getList(userId: string, id: string): Promise<LeadList | null> {
  const r = await q1<Row>(
    `SELECT ll.*, COUNT(li.lead_id)::int AS lead_count
     FROM lead_lists ll LEFT JOIN lead_list_items li ON li.list_id = ll.id
     WHERE ll.id = ? AND ll.user_id = ? GROUP BY ll.id`,
    [id, userId],
  );
  if (!r) return null;
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    segmentSlug: r.segment_slug as string,
    createdAt: r.created_at as string,
    leadCount: toNum(r.lead_count),
  };
}

// --- Dashboard -------------------------------------------------------------

export interface DashboardMetrics {
  totalCompanies: number;
  savedLeads: number;
  byStage: { stage: Stage; count: number; value: number }[];
  byTier: { tier: string; count: number }[];
  pipelineValue: number;
  wonValue: number;
  conversionRate: number;
  contactRate: number;
  withDecisionMaker: number;
  decisionMakerRate: number;
  topCities: { city: string; count: number }[];
  topSubsegments: { name: string; count: number }[];
  recentActivities: (Activity & { companyName: string })[];
  weekly: { week: string; count: number }[];
  avgScore: number;
}

export async function dashboardMetrics(userId: string, segment: string): Promise<DashboardMetrics> {
  const [leads, totalRow, acts] = await Promise.all([
    listLeads(userId, { segment }),
    q1<{ n: number }>("SELECT COUNT(*)::int AS n FROM companies WHERE segment_slug = ?", [segment]),
    q<Row>(
      `SELECT a.*, c.name AS company_name FROM activities a
       JOIN leads l ON l.id = a.lead_id JOIN companies c ON c.id = l.company_id
       WHERE l.user_id = ? AND c.segment_slug = ? ORDER BY a.created_at DESC LIMIT 12`,
      [userId, segment],
    ),
  ]);

  const byStage = STAGES.map((stage) => {
    const subset = leads.filter((l) => l.stage === stage);
    return { stage, count: subset.length, value: subset.reduce((a, l) => a + (l.estimatedValue ?? 0), 0) };
  });

  const byTier = ["A", "B", "C", "D"].map((tier) => ({
    tier,
    count: leads.filter((l) => l.tier === tier).length,
  }));

  const clientes = leads.filter((l) => l.stage === "cliente");
  const contatados = leads.filter((l) => l.stage !== "novo");
  const comDecisor = leads.filter((l) => l.decisionMakers.some((d) => d.name && !d.inferred));

  const cityMap = new Map<string, number>();
  const subMap = new Map<string, number>();
  const segCfg = getSegment(segment);
  for (const l of leads) {
    cityMap.set(l.company.city, (cityMap.get(l.company.city) ?? 0) + 1);
    const sub = segCfg.subsegments.find((s) => s.slug === l.company.subsegmentSlug);
    const nome = sub?.name ?? l.company.subsegmentSlug;
    subMap.set(nome, (subMap.get(nome) ?? 0) + 1);
  }

  // Leads salvos por semana nas últimas 8 semanas.
  const weekly: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(Date.now() - i * 7 * 24 * 3600 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
    weekly.push({
      week: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      count: leads.filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t > start.getTime() && t <= end.getTime();
      }).length,
    });
  }

  return {
    totalCompanies: toNum(totalRow?.n),
    savedLeads: leads.length,
    byStage,
    byTier,
    pipelineValue: leads.filter((l) => l.stage !== "cliente").reduce((a, l) => a + (l.estimatedValue ?? 0), 0),
    wonValue: clientes.reduce((a, l) => a + (l.estimatedValue ?? 0), 0),
    conversionRate: leads.length ? Math.round((clientes.length / leads.length) * 1000) / 10 : 0,
    contactRate: leads.length ? Math.round((contatados.length / leads.length) * 1000) / 10 : 0,
    withDecisionMaker: comDecisor.length,
    decisionMakerRate: leads.length ? Math.round((comDecisor.length / leads.length) * 1000) / 10 : 0,
    topCities: [...cityMap.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    topSubsegments: [...subMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    recentActivities: acts.map((a) => ({
      id: a.id as string,
      leadId: a.lead_id as string,
      type: a.type as Activity["type"],
      message: a.message as string,
      createdAt: a.created_at as string,
      companyName: a.company_name as string,
    })),
    weekly,
    avgScore: leads.length ? Math.round(leads.reduce((a, l) => a + l.score, 0) / leads.length) : 0,
  };
}
