import type { Company, RoleCategory, ScoreFactor } from "@/lib/types";

/**
 * Um segmento é 100% configuração. Adicionar um mercado novo ao Prospecta
 * (Saúde, Construção, Indústria...) significa criar um arquivo como
 * `food-service.ts` e registrá-lo em `segments/index.ts` — nenhuma tela,
 * rota ou tabela precisa mudar.
 */
export interface SegmentConfig {
  slug: string;
  name: string;
  /** Frase curta mostrada no seletor de segmento. */
  tagline: string;
  emoji: string;
  /** Cor de destaque do segmento (classe utilitária de acento). */
  accent: string;

  subsegments: Subsegment[];

  /** Cargos que costumam decidir a compra nesse mercado, em ordem de prioridade. */
  decisionRoles: DecisionRole[];

  /** Regras que transformam sinais públicos em pontuação 0-100. */
  scoreFactors: ScoreFactorRule[];

  /** Estimativa de ticket/potencial mensal, usada como valor inicial no CRM. */
  estimateValue: (company: Company) => number;

  /** Rótulos de UI que mudam de mercado pra mercado. */
  labels: {
    companyPlural: string;
    volumeSignal: string; // ex.: "movimento estimado"
    buyerHint: string; // dica de abordagem exibida na ficha
  };
}

export interface Subsegment {
  slug: string;
  name: string;
  /** CNAEs que caracterizam o subsegmento (usados na busca por dado público). */
  cnaes: string[];
  /** Termos usados na busca textual e no casamento com fontes de mapa. */
  keywords: string[];
  /** Peso de consumo/potencial do subsegmento dentro do segmento (0-1). */
  demandWeight: number;
}

export interface DecisionRole {
  category: RoleCategory;
  /** Cargo literal a procurar/sugerir. */
  title: string;
  /** Só sugerir esse cargo se a empresa tiver pelo menos esse porte estimado. */
  minEmployees: number;
  /** Prioridade de abordagem: 1 = fale com essa pessoa primeiro. */
  priority: number;
  approach: string;
}

export interface ScoreFactorRule {
  key: string;
  label: string;
  maxPoints: number;
  evaluate: (ctx: ScoreContext) => Omit<ScoreFactor, "key" | "label" | "maxPoints">;
}

export interface ScoreContext {
  company: Company;
  subsegment: Subsegment | null;
  /** Quantidade de decisores com nome próprio identificado. */
  namedDecisionMakers: number;
  /** Melhor categoria de decisor encontrada (nome ou inferência). */
  bestRoleCategory: RoleCategory | null;
  employeesEstimate: number;
}
