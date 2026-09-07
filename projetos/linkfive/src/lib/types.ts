// ---------------------------------------------------------------------------
// Contratos de dados do LINKFIVE.
//
// As linhas do banco guardam booleano como INTEGER e JSON como TEXT (o driver
// não converte sozinho). Por isso existem dois níveis de tipo: `*Row`, que é o
// que sai do Postgres, e o tipo da aplicação, já convertido. A conversão mora
// no repositório — nenhuma tela lê `Row` direto.
// ---------------------------------------------------------------------------

export type PlanId = "free" | "starter" | "pro" | "business";
export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  plan: PlanId;
  onboarded: boolean;
  createdAt: string;
}

/** Os 13 tipos de link. `link` é o genérico; o resto tem componente próprio. */
export type LinkType =
  | "link"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "maps"
  | "phone"
  | "email"
  | "catalog"
  | "product"
  | "service"
  | "form";

/** Config específica por tipo, guardada como JSON na coluna `config`. */
export interface LinkConfig {
  /** whatsapp: número em dígitos, com DDI. Ex.: 5511973933648 */
  numero?: string;
  /** whatsapp: mensagem que já vem digitada na conversa */
  mensagem?: string;
  /** product | service: preço em centavos, para não carregar erro de float */
  precoCents?: number;
  /** product | service */
  imagem?: string;
  descricao?: string;
  /** form: quais campos aparecem e o título do bloco */
  campos?: LeadField[];
  formTitulo?: string;
}

export type LeadField = "name" | "whatsapp" | "email" | "company" | "message";

export interface PageLink {
  id: string;
  pageId: string;
  type: LinkType;
  title: string;
  url: string;
  icon: string | null;
  config: LinkConfig;
  position: number;
  active: boolean;
  createdAt: string;
}

export interface Page {
  id: string;
  userId: string;
  slug: string;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  themeId: string;
  themeOverrides: Record<string, string>;
  published: boolean;
  suspended: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  pageId: string;
  linkId: string | null;
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  company: string | null;
  message: string | null;
  source: string | null;
  createdAt: string;
}

export interface DailyStat {
  day: string;
  views: number;
  clicks: number;
  whatsappClicks: number;
  leads: number;
}

/** Períodos do filtro de analytics. */
export type Periodo = "hoje" | "7d" | "30d" | "90d";

export const PERIODO_DIAS: Record<Periodo, number> = {
  hoje: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};
