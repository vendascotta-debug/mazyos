// ---------------------------------------------------------------------------
// Tipos centrais do Prospecta.
// Nada aqui é específico de Food Service: o segmento entra como configuração
// (ver src/lib/segments), o que permite plugar Saúde, Varejo, Indústria etc.
// ---------------------------------------------------------------------------

export type UF =
  | "AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA"
  | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN"
  | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO";

/** Faixa de porte declarada na Receita / inferida por sinais públicos. */
export type Porte = "MEI" | "ME" | "EPP" | "DEMAIS";

export type SituacaoCadastral = "ATIVA" | "SUSPENSA" | "INAPTA" | "BAIXADA";

export interface Company {
  id: string;
  segmentSlug: string;
  subsegmentSlug: string;

  /** Nome fantasia — o nome pelo qual o mercado conhece a empresa. */
  name: string;
  /** Razão social registrada. */
  legalName: string;
  cnpj: string | null;

  // Localização
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: UF;
  zip: string | null;
  lat: number;
  lng: number;

  // Contato público
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  /** Página da empresa no LinkedIn (não confundir com o perfil do decisor). */
  linkedin: string | null;

  // Sinais públicos usados no score
  rating: number | null;
  reviewsCount: number | null;
  priceLevel: 1 | 2 | 3 | 4 | null;
  employeesRange: string | null;
  unitsCount: number;
  openedAt: string | null; // ISO date da abertura do CNPJ
  capitalSocial: number | null;
  porte: Porte | null;
  situacao: SituacaoCadastral | null;
  cnaePrincipal: string | null;
  cnaePrincipalDesc: string | null;
  cnaeSecundarios: string[];
  deliveryApps: string[];
  hours: string | null;

  /** Procedência de cada bloco de dado, pra transparência na tela. */
  sources: DataSource[];

  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  label: string;
  kind: "cnpj" | "mapa" | "web" | "redes" | "avaliacoes";
  collectedAt: string;
  url?: string;
}

// --- Decisores -------------------------------------------------------------

/**
 * Categorias de decisor. `roleCategory` é estável entre segmentos (o CRM e o
 * score dependem dela); `role` é o cargo literal encontrado no dado público.
 */
export type RoleCategory =
  | "proprietario"
  | "socio"
  | "diretor"
  | "gerente_compras"
  | "suprimentos"
  | "operacoes"
  | "ab" // Alimentos & Bebidas — específico de Food Service
  | "nutricao" // RT de nutrição: quem especifica em hospital, escola e ILPI
  | "financeiro"
  | "marketing"
  | "outro";

export type Confidence = "alta" | "media" | "baixa";

export interface DecisionMaker {
  id: string;
  companyId: string;
  name: string | null;
  role: string;
  roleCategory: RoleCategory;
  confidence: Confidence;
  /** Como o Prospecta chegou nessa pessoa/cargo. Exibido na ficha. */
  evidence: string;
  source: string;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  /** true quando é um cargo inferido (sem nome) e não uma pessoa identificada. */
  inferred: boolean;
  entryDate: string | null; // entrada no quadro societário
  participation: number | null; // % de participação, quando público
}

// --- Score -----------------------------------------------------------------

export interface ScoreFactor {
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export type ScoreTier = "A" | "B" | "C" | "D";

export interface LeadScore {
  total: number; // 0-100
  tier: ScoreTier;
  factors: ScoreFactor[];
  /** Frase curta explicando o score, usada em listas e cards. */
  summary: string;
}

// --- CRM -------------------------------------------------------------------

export const STAGES = [
  "novo",
  "contatado",
  "interessado",
  "cotacao",
  "negociacao",
  "cliente",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  novo: "Novo",
  contatado: "Contatado",
  interessado: "Interessado",
  cotacao: "Cotação",
  negociacao: "Negociação",
  cliente: "Cliente",
};

export interface Lead {
  id: string;
  companyId: string;
  stage: Stage;
  score: number;
  tier: ScoreTier;
  note: string | null;
  estimatedValue: number | null;
  ownerName: string | null;
  lastContactAt: string | null;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadWithCompany extends Lead {
  company: Company;
  decisionMakers: DecisionMaker[];
  lists: { id: string; name: string }[];
}

export interface LeadList {
  id: string;
  name: string;
  description: string | null;
  segmentSlug: string;
  createdAt: string;
  leadCount?: number;
}

export type ActivityType =
  | "criado"
  | "etapa"
  | "nota"
  | "contato"
  | "lista"
  | "valor";

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  message: string;
  createdAt: string;
}

// --- Busca -----------------------------------------------------------------

export interface SearchFilters {
  segment: string;
  subsegments: string[];
  city: string | null;
  uf: string | null;
  neighborhood: string | null;
  /** Raio em km a partir do centro geográfico do filtro de cidade/bairro. */
  radiusKm: number | null;
  centerLat: number | null;
  centerLng: number | null;
  query: string | null;
  minScore: number;
  onlyWithDecisionMaker: boolean;
  onlyWithPhone: boolean;
  hideSaved: boolean;
  /** Ignora segmento e subsegmento: busca por nome em toda a base. */
  allSegments: boolean;
  porte: Porte[];
  sort: "score" | "name" | "reviews" | "distance" | "recent";
  page: number;
  pageSize: number;
}

export interface CompanyResult {
  company: Company;
  score: LeadScore;
  decisionMakers: DecisionMaker[];
  distanceKm: number | null;
  savedLeadId: string | null;
  savedStage: Stage | null;
}
