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
//
// ESTRUTURA (definida em 07/09/2026, espelhando o url.gratis):
//
// Dois tetos diferentes para links diretos, e é de propósito:
//   maxCurtos    → quantos podem existir ATIVOS ao mesmo tempo
//   maxCurtosMes → quantos podem ser CRIADOS por mês
//
// O primeiro é o número de vitrine; o segundo é o que realmente segura o uso.
// Um teto alto de ativos com cota mensal apertada deixa o plano generoso na
// leitura e controlado na prática.
//
// O vocabulário deles ("projetos", "workspaces") virou o nosso: projeto é
// PÁGINA, membro é EQUIPE. "Workspace" não tem equivalente e ficou de fora —
// inventar uma camada só para igualar a tabela seria vender o que não existe.
// ---------------------------------------------------------------------------

export interface Plano {
  id: PlanId;
  nome: string;
  /** Em centavos, para não carregar erro de ponto flutuante. */
  precoCents: number;
  /** Preço do ano inteiro. `null` = plano sem opção anual. */
  precoAnualCents: number | null;
  /** Links na página. `null` = ilimitado. */
  maxLinks: number | null;
  /** Links diretos ativos ao mesmo tempo. `null` = ilimitado. */
  maxCurtos: number | null;
  /** Links diretos que podem ser criados por mês. `null` = ilimitado. */
  maxCurtosMes: number | null;
  /** Páginas (o "projeto" do concorrente). */
  maxPaginas: number;
  /** Pessoas com acesso à conta. */
  maxMembros: number;
  /** Até quantos dias atrás o analytics mostra. */
  analyticsDias: number;
  /** Formulário de captura e aba de Leads. */
  formularios: boolean;
  /** De onde veio a visita e em que aparelho — dados que já coletamos. */
  metricasDetalhadas: boolean;
  /** País de origem da visita. */
  metricasGeo: boolean;
  /** Expiração, senha e troca de destino nos links diretos. */
  gestaoLinks: boolean;
  /** Escolher tema. */
  temas: boolean;
  /**
   * Enviar o PDF do catalogo pra dentro do LINKFIVE.
   *
   * Fica fora do Gratis por causa da banda: guardar PDF e barato, servir nao.
   * Um catalogo de 20 MB aberto 500 vezes no mes passa de 10 GB de trafego —
   * mais do que a mensalidade cobre. Quem nao paga continua podendo apontar
   * pra um catalogo hospedado fora (Drive, site proprio).
   */
  catalogoPdf: boolean;
  /** Editar cor, fonte e formato de botão além do tema. */
  personalizacaoAvancada: boolean;
  /** Assinatura "Feito com LINKFIVE" no rodapé da página pública. */
  marca: boolean;
  equipe: boolean;
  destaque?: string;
  /** Fora da página de preços: só o admin concede. */
  oculto?: boolean;
}

export const PLANOS: Record<PlanId, Plano> = {
  free: {
    id: "free",
    nome: "Grátis",
    precoCents: 0,
    precoAnualCents: null,
    maxLinks: null,
    maxCurtos: 10000,
    maxCurtosMes: 100,
    maxPaginas: 10,
    maxMembros: 1,
    // Três dias é curto de propósito: o produto funciona de graça, mas quem
    // quer saber o que deu certo precisa de histórico. É a alavanca de
    // upgrade do concorrente, e funciona.
    analyticsDias: 3,
    formularios: false,
    metricasDetalhadas: false,
    metricasGeo: false,
    gestaoLinks: false,
    temas: false,
    catalogoPdf: false,
    personalizacaoAvancada: false,
    marca: true,
    equipe: false,
  },
  starter: {
    id: "starter",
    nome: "Starter",
    precoCents: 1090,
    // 12 meses sairiam R$ 238,80 — o anual desconta ~16%.
    precoAnualCents: 9700,
    maxLinks: null,
    maxCurtos: 10000,
    maxCurtosMes: 300,
    maxPaginas: 100,
    maxMembros: 5,
    analyticsDias: 60,
    formularios: true,
    metricasDetalhadas: true,
    metricasGeo: false,
    gestaoLinks: true,
    temas: true,
    catalogoPdf: true,
    personalizacaoAvancada: true,
    marca: false,
    equipe: true,
    destaque: "Mais escolhido",
  },
  pro: {
    id: "pro",
    nome: "Pro",
    precoCents: 1990,
    precoAnualCents: 19700,
    maxLinks: null,
    maxCurtos: null,
    maxCurtosMes: null,
    maxPaginas: 1000,
    maxMembros: 20,
    analyticsDias: 365,
    formularios: true,
    metricasDetalhadas: true,
    metricasGeo: true,
    gestaoLinks: true,
    temas: true,
    catalogoPdf: true,
    personalizacaoAvancada: true,
    marca: false,
    equipe: true,
  },
  cortesia: {
    id: "cortesia",
    nome: "Cortesia",
    precoCents: 0,
    precoAnualCents: null,
    maxLinks: null,
    maxCurtos: null,
    maxCurtosMes: null,
    maxPaginas: 1000,
    maxMembros: 20,
    analyticsDias: 365,
    formularios: true,
    metricasDetalhadas: true,
    metricasGeo: true,
    gestaoLinks: true,
    temas: true,
    catalogoPdf: true,
    personalizacaoAvancada: true,
    marca: false,
    equipe: true,
    oculto: true,
  },
};

/** Ordem dos planos vendidos — é o que a landing e a tela de preços mostram. */
export const ORDEM_PLANOS: PlanId[] = ["free", "starter", "pro"];

/** Todos os planos, inclusive o Cortesia. Só o painel administrativo usa. */
export const ORDEM_PLANOS_ADMIN: PlanId[] = [...ORDEM_PLANOS, "cortesia"];

/**
 * Planos que já existiram e não estão mais à venda.
 *
 * O "business" foi absorvido pelo Pro na revisão de 07/09/2026. Quem estivesse
 * nele não pode virar Free do nada — perderia recurso que já usava.
 */
const LEGADO: Record<string, PlanId> = { business: "pro" };

export function plano(id: PlanId | string | null | undefined): Plano {
  const chave = (id ?? "free") as string;
  return PLANOS[chave as PlanId] ?? PLANOS[LEGADO[chave] ?? "free"];
}

export type Ciclo = "mensal" | "anual";

/** "R$ 19,90" ou "Grátis". */
export function precoFormatado(p: Plano, ciclo: Ciclo = "mensal"): string {
  const cents = ciclo === "anual" ? p.precoAnualCents : p.precoCents;
  if (!cents) return "Grátis";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Quanto sai por mês quando paga o ano inteiro. */
export function mensalNoAnual(p: Plano): string | null {
  if (!p.precoAnualCents) return null;
  return (p.precoAnualCents / 12 / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Quanto por cento o anual economiza. */
export function descontoAnual(p: Plano): number | null {
  if (!p.precoAnualCents || !p.precoCents) return null;
  const doze = p.precoCents * 12;
  return Math.round(((doze - p.precoAnualCents) / doze) * 100);
}

/** O plano seguinte na escada, ou null se já está no topo. */
export function proximoPlano(id: PlanId): Plano | null {
  // Cortesia já tem tudo liberado; não existe "próximo" pra oferecer.
  if (id === "cortesia") return null;
  const i = ORDEM_PLANOS.indexOf(id);
  const próximo = ORDEM_PLANOS[i + 1];
  return próximo ? PLANOS[próximo] : null;
}

// --- Checagens de cota -----------------------------------------------------

export type Veredito = { permitido: true } | { permitido: false; motivo: string; upgrade: PlanId };

/**
 * Pode criar mais um link na página?
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
    upgrade: up?.id ?? "starter",
  };
}

/**
 * Pode criar mais um link direto?
 *
 * Confere os dois tetos. A cota mensal quase sempre é a que barra primeiro —
 * e a mensagem precisa dizer QUAL dos dois estourou, senão o usuário fica sem
 * entender por que "10.000 links" não deixou ele criar o de número 101.
 */
export function podeCriarCurto(planId: PlanId, ativos: number, criadosNoMes: number): Veredito {
  const p = plano(planId);
  const up = proximoPlano(planId);

  if (p.maxCurtosMes !== null && criadosNoMes >= p.maxCurtosMes) {
    return {
      permitido: false,
      motivo: `O plano ${p.nome} permite criar ${p.maxCurtosMes} links diretos por mês, e você já criou todos. A cota volta no dia 1º.`,
      upgrade: up?.id ?? "starter",
    };
  }

  if (p.maxCurtos !== null && ativos >= p.maxCurtos) {
    return {
      permitido: false,
      motivo: `O plano ${p.nome} permite ${p.maxCurtos.toLocaleString("pt-BR")} links diretos ativos. Pause ou exclua algum para criar outro.`,
      upgrade: up?.id ?? "starter",
    };
  }

  return { permitido: true };
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
    upgrade: up?.id ?? "pro",
  };
}

export function podeUsarFormularios(planId: PlanId): Veredito {
  if (plano(planId).formularios) return { permitido: true };
  return {
    permitido: false,
    motivo: "A captura de leads está disponível a partir do plano Starter.",
    upgrade: "starter",
  };
}

export function podeGerirLinks(planId: PlanId): Veredito {
  if (plano(planId).gestaoLinks) return { permitido: true };
  return {
    permitido: false,
    motivo:
      "Expiração, senha e troca de destino estão disponíveis a partir do plano Starter.",
    upgrade: "starter",
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
 * "seu plano mostra os últimos 3 dias" em vez de um gráfico misteriosamente
 * curto.
 */
export function janelaAnalytics(planId: PlanId, diasPedidos: number) {
  const limite = plano(planId).analyticsDias;
  return { dias: Math.min(diasPedidos, limite), cortado: diasPedidos > limite, limite };
}
