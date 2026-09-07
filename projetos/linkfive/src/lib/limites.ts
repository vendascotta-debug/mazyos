import type { PlanId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Limites de plano — fonte única.
//
// Se o número do limite aparecer em dois lugares do código, um dia eles vão
// divergir e o usuário vai conseguir passar do limite por uma tela e não por
// outra. Tudo pergunta aqui: rota de API, tela, banner de upgrade.
//
// A checagem que VALE é a do servidor. Esconder o botão no front é conforto,
// não controle de acesso.
// ---------------------------------------------------------------------------

export interface Plano {
  id: PlanId;
  nome: string;
  /** Em centavos, para não carregar erro de ponto flutuante. */
  precoCents: number;
  /** `null` = ilimitado. */
  maxLinks: number | null;
  /** Links curtos diretos (/w/abc123). `null` = ilimitado. */
  maxCurtos: number | null;
  maxPaginas: number;
  /** Até quantos dias atrás o analytics mostra. */
  analyticsDias: number;
  /** Formulário de captura e aba de Leads. */
  formularios: boolean;
  /** Escolher tema. */
  temas: boolean;
  /** Editar cor, fonte e formato de botão além do tema. */
  personalizacaoAvancada: boolean;
  /** Assinatura "Feito com LINKFIVE" no rodapé da página pública. */
  marca: boolean;
  equipe: boolean;
  destaque?: string;
}

export const PLANOS: Record<PlanId, Plano> = {
  free: {
    id: "free",
    nome: "Free",
    precoCents: 0,
    maxLinks: 5,
    maxCurtos: 1,
    maxPaginas: 1,
    analyticsDias: 7,
    formularios: false,
    temas: false,
    personalizacaoAvancada: false,
    marca: true,
    equipe: false,
  },
  starter: {
    id: "starter",
    nome: "Starter",
    precoCents: 990,
    maxLinks: 25,
    maxCurtos: 5,
    maxPaginas: 1,
    analyticsDias: 30,
    formularios: false,
    temas: true,
    personalizacaoAvancada: false,
    marca: true,
    equipe: false,
  },
  pro: {
    id: "pro",
    nome: "Pro",
    precoCents: 1990,
    maxLinks: null,
    maxCurtos: 50,
    maxPaginas: 1,
    analyticsDias: 90,
    formularios: true,
    temas: true,
    personalizacaoAvancada: true,
    marca: false,
    equipe: false,
    destaque: "Mais escolhido",
  },
  business: {
    id: "business",
    nome: "Business",
    precoCents: 3990,
    maxLinks: null,
    maxCurtos: null,
    maxPaginas: 5,
    analyticsDias: 365,
    formularios: true,
    temas: true,
    personalizacaoAvancada: true,
    marca: false,
    equipe: true,
  },
};

export const ORDEM_PLANOS: PlanId[] = ["free", "starter", "pro", "business"];

export function plano(id: PlanId | string | null | undefined): Plano {
  return PLANOS[(id as PlanId) ?? "free"] ?? PLANOS.free;
}

/** "R$ 19,90" ou "Grátis". */
export function precoFormatado(p: Plano): string {
  if (p.precoCents === 0) return "Grátis";
  return (p.precoCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** O plano seguinte na escada, ou null se já está no topo. */
export function proximoPlano(id: PlanId): Plano | null {
  const i = ORDEM_PLANOS.indexOf(id);
  const próximo = ORDEM_PLANOS[i + 1];
  return próximo ? PLANOS[próximo] : null;
}

// --- Checagens de cota -----------------------------------------------------

export type Veredito = { permitido: true } | { permitido: false; motivo: string; upgrade: PlanId };

/**
 * Pode criar mais um link?
 *
 * `atuais` é a contagem que veio do banco. Quem chama é responsável por contar
 * dentro da mesma requisição — não guardamos contador desnormalizado, que é
 * onde esse tipo de regra costuma furar.
 */
export function podeCriarLink(planId: PlanId, atuais: number): Veredito {
  const p = plano(planId);
  if (p.maxLinks === null || atuais < p.maxLinks) return { permitido: true };
  const up = proximoPlano(planId);
  return {
    permitido: false,
    motivo: `O plano ${p.nome} permite ${p.maxLinks} links. Você já usou todos.`,
    upgrade: up?.id ?? "pro",
  };
}

/** Pode criar mais um link curto direto (/w/abc123)? */
export function podeCriarCurto(planId: PlanId, atuais: number): Veredito {
  const p = plano(planId);
  if (p.maxCurtos === null || atuais < p.maxCurtos) return { permitido: true };
  const up = proximoPlano(planId);
  return {
    permitido: false,
    motivo:
      p.maxCurtos === 1
        ? `O plano ${p.nome} permite um link direto. Para criar mais, mude de plano.`
        : `O plano ${p.nome} permite ${p.maxCurtos} links diretos. Você já usou todos.`,
    upgrade: up?.id ?? "pro",
  };
}

export function podeCriarPagina(planId: PlanId, atuais: number): Veredito {
  const p = plano(planId);
  if (atuais < p.maxPaginas) return { permitido: true };
  const up = proximoPlano(planId);
  return {
    permitido: false,
    motivo:
      p.maxPaginas === 1
        ? `O plano ${p.nome} permite uma página. Para ter mais de uma, mude de plano.`
        : `O plano ${p.nome} permite ${p.maxPaginas} páginas.`,
    upgrade: up?.id ?? "business",
  };
}

export function podeUsarFormularios(planId: PlanId): Veredito {
  if (plano(planId).formularios) return { permitido: true };
  return {
    permitido: false,
    motivo: "A captura de leads está disponível a partir do plano Pro.",
    upgrade: "pro",
  };
}

export function podeTrocarTema(planId: PlanId): Veredito {
  if (plano(planId).temas) return { permitido: true };
  return {
    permitido: false,
    motivo: "A troca de tema está disponível a partir do plano Starter.",
    upgrade: "starter",
  };
}

/**
 * Recorta o período pedido ao que o plano enxerga.
 *
 * Devolve os dias efetivos e se houve corte — a tela usa isso pra mostrar
 * "seu plano mostra os últimos 7 dias" em vez de um gráfico misteriosamente
 * curto.
 */
export function janelaAnalytics(planId: PlanId, diasPedidos: number) {
  const limite = plano(planId).analyticsDias;
  return { dias: Math.min(diasPedidos, limite), cortado: diasPedidos > limite, limite };
}
