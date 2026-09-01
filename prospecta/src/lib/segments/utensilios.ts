import type { SegmentConfig } from "./types";

/**
 * Utensílios e Equipamentos de cozinha.
 *
 * Este segmento olha para o outro lado do balcão: fabricantes, importadores e
 * atacadistas do que o Alessandro vende. Serve para duas coisas ao mesmo tempo —
 * achar fornecedor para representar ou comprar, e mapear a concorrência da
 * praça. Não confundir com "Distribuidores e Canal", que é o atacado de
 * alimentos e bebidas.
 *
 * Quem se procura aqui é o comercial: numa fábrica ou importadora, quem abre
 * cadastro de revenda e negocia tabela é o gerente comercial, não o comprador.
 */
export const utensilios: SegmentConfig = {
  slug: "utensilios",
  name: "Utensílios e Equipamentos",
  tagline: "Fabricantes, importadores e atacadistas — fornecedores e concorrentes",
  emoji: "🍴",
  accent: "#be123c",

  subsegments: [
    {
      slug: "fabricante-utensilios",
      name: "Fabricante de utensílios (metal e inox)",
      cnaes: ["2593-4/00", "2599-3/99"],
      keywords: ["utensílios", "inox", "artigos de metal", "panelas", "talheres"],
      demandWeight: 1,
    },
    {
      slug: "fabricante-plastico",
      name: "Fabricante de artigos plásticos e descartáveis",
      cnaes: ["2229-3/02", "2222-6/00"],
      keywords: ["plástico uso doméstico", "descartáveis", "embalagem"],
      demandWeight: 0.85,
    },
    {
      slug: "fabricante-louca",
      name: "Fabricante de louças e cerâmica",
      cnaes: ["2349-4/99", "2312-5/00"],
      keywords: ["louça", "cerâmica", "porcelana", "vidro"],
      demandWeight: 0.8,
    },
    {
      // Fogão industrial, forno, coifa, câmara fria: o equipamento pesado da
      // cozinha profissional.
      slug: "fabricante-equipamentos",
      name: "Fabricante de equipamentos de cozinha industrial",
      cnaes: ["2823-2/00", "2821-6/01", "2790-2/99"],
      keywords: ["fogão industrial", "forno", "coifa", "refrigeração comercial", "câmara fria"],
      demandWeight: 1,
    },
    {
      slug: "atacado-utensilios",
      name: "Atacado de utensílios e equipamentos",
      cnaes: ["4644-3/02", "4649-4/99", "4665-6/00", "4669-9/99"],
      keywords: ["atacado de utensílios", "equipamentos para uso comercial", "atacadista"],
      demandWeight: 0.95,
    },
    {
      slug: "importadora-utensilios",
      name: "Importadora de utensílios",
      cnaes: ["4689-3/99"],
      keywords: ["importadora", "trading", "utensílios importados"],
      demandWeight: 0.9,
    },
    {
      slug: "loja-utensilios",
      name: "Loja de artigos e utensílios",
      cnaes: ["4759-8/99", "4753-9/00"],
      keywords: ["loja de utensílios", "artigos para casa", "utilidades domésticas", "eletrodomésticos"],
      demandWeight: 0.6,
    },
  ],

  decisionRoles: [
    {
      category: "marketing",
      title: "Gerente Comercial / Vendas",
      minEmployees: 10,
      priority: 1,
      approach:
        "É quem abre cadastro de revenda e define tabela e política de desconto. Peça a tabela de distribuidor, não o preço de balcão.",
    },
    {
      category: "proprietario",
      title: "Proprietário",
      minEmployees: 0,
      priority: 2,
      approach: "Fabricante pequeno: o dono negocia direto e decide exclusividade de praça.",
    },
    {
      category: "socio",
      title: "Sócio-administrador",
      minEmployees: 0,
      priority: 3,
      approach: "Consta no quadro societário público. Assina contrato de representação.",
    },
    {
      category: "diretor",
      title: "Diretor Comercial",
      minEmployees: 50,
      priority: 2,
      approach: "Em indústria grande, a política de canal passa pela diretoria comercial.",
    },
    {
      category: "operacoes",
      title: "Gerente de Exportação / Importação",
      minEmployees: 20,
      priority: 4,
      approach: "Em importadora, é quem conhece prazo de container e lote mínimo.",
    },
  ],

  scoreFactors: [
    {
      key: "porte",
      label: "Porte da operação",
      maxPoints: 30,
      evaluate: ({ employeesEstimate, company }) => {
        // Fornecedor maior tem catálogo e estoque; fornecedor pequeno dá
        // exclusividade. Os dois interessam, mas o grande pontua mais.
        const p =
          employeesEstimate >= 80 ? 30 :
          employeesEstimate >= 40 ? 25 :
          employeesEstimate >= 20 ? 20 :
          employeesEstimate >= 8 ? 14 : 8;
        return { points: p, detail: `~${employeesEstimate} funcionários · ${company.porte ?? "porte n/d"}` };
      },
    },
    {
      key: "fit",
      label: "Aderência ao que você vende",
      maxPoints: 25,
      evaluate: ({ subsegment }) => ({
        points: Math.round((subsegment?.demandWeight ?? 0.5) * 25),
        detail: subsegment?.name ?? "não classificado",
      }),
    },
    {
      key: "maturidade",
      label: "Tempo de mercado",
      maxPoints: 15,
      evaluate: ({ company }) => {
        if (!company.openedAt) return { points: 5, detail: "data de abertura não disponível" };
        const anos = (Date.now() - new Date(company.openedAt).getTime()) / (365.25 * 24 * 3600 * 1000);
        return {
          points: anos >= 15 ? 15 : anos >= 8 ? 13 : anos >= 3 ? 10 : 6,
          detail: `${Math.round(anos)} anos de operação`,
        };
      },
    },
    {
      key: "decisor",
      label: "Decisor identificado",
      maxPoints: 20,
      evaluate: ({ namedDecisionMakers }) => ({
        points: namedDecisionMakers >= 2 ? 20 : namedDecisionMakers === 1 ? 15 : 5,
        detail: namedDecisionMakers
          ? `${namedDecisionMakers} decisor(es) em fonte pública`
          : "apenas cargo provável pelo porte",
      }),
    },
    {
      key: "contato",
      label: "Canais de contato",
      maxPoints: 10,
      evaluate: ({ company }) => {
        let p = 0;
        if (company.phone) p += 4;
        if (company.email) p += 4;
        if (company.website) p += 2;
        return {
          points: Math.min(10, p),
          detail: company.phone || company.email ? "contato direto disponível" : "sem contato público",
        };
      },
    },
  ],

  // Aqui o "valor" é o quanto você poderia comprar por mês desse fornecedor.
  estimateValue: (company) => {
    const base = 3000;
    const mult =
      company.porte === "DEMAIS" ? 8 : company.porte === "EPP" ? 4 : company.porte === "ME" ? 1.8 : 1;
    return Math.round((base * mult) / 100) * 100;
  },

  labels: {
    companyPlural: "fornecedores",
    volumeSignal: "porte da operação",
    buyerHint:
      "Você é o comprador nesta tela. Procure o comercial e peça cadastro de revenda, tabela de distribuidor e lote mínimo.",
  },
};
