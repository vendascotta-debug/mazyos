import type { SegmentConfig } from "./types";

/**
 * Distribuidores e canal.
 *
 * Estas empresas NÃO compram utensílio de você — são concorrentes ou parceiros
 * de canal. Estão aqui porque são o público do outro negócio: vender dados de
 * prospecção e o próprio Prospecta. Por isso tudo muda em relação ao Food
 * Service: quem decide é o comercial (não o comprador de insumos), e o que
 * pontua é tamanho da força de vendas e maturidade digital, não movimento de
 * salão.
 */
export const distribuidores: SegmentConfig = {
  slug: "distribuidores",
  name: "Distribuidores e Canal",
  tagline: "Distribuidoras, revendas e representantes — público de dados",
  emoji: "🚚",
  accent: "#7c3aed",

  subsegments: [
    {
      slug: "distribuidor-alimentos",
      name: "Distribuidora de alimentos",
      cnaes: ["4639-7/01", "4639-7/02", "4632-0/01"],
      keywords: ["distribuidora de alimentos", "atacado alimentício", "food service"],
      demandWeight: 1,
    },
    {
      slug: "distribuidor-bebidas",
      name: "Distribuidora de bebidas",
      cnaes: ["4635-4/02", "4635-4/99"],
      keywords: ["distribuidora de bebidas", "cervejas", "atacado de bebidas"],
      demandWeight: 0.9,
    },
    {
      slug: "revenda-equipamentos",
      name: "Revenda de equipamentos e utensílios",
      cnaes: ["4644-3/02", "4649-4/08", "4665-6/00"],
      keywords: ["equipamentos para restaurantes", "utensílios profissionais", "inox", "loja de equipamentos"],
      demandWeight: 0.95,
    },
    {
      slug: "representante",
      name: "Representante comercial do setor",
      cnaes: ["4614-1/00", "4618-4/99"],
      keywords: ["representante comercial", "representação", "agente comercial"],
      demandWeight: 0.8,
    },
    {
      slug: "importador",
      name: "Importadora e trading",
      cnaes: ["4619-2/00", "4693-1/00"],
      keywords: ["importadora", "trading", "importação de alimentos"],
      demandWeight: 0.85,
    },
  ],

  // Quem assina a compra de dados/software é o comercial e a diretoria —
  // Compras aqui cuida de mercadoria para revenda, não entra nessa decisão.
  decisionRoles: [
    {
      category: "proprietario",
      title: "Proprietário",
      minEmployees: 0,
      priority: 1,
      approach:
        "Distribuidora pequena: o dono acompanha a equipe de rua e decide investir em prospecção.",
    },
    {
      category: "socio",
      title: "Sócio-administrador",
      minEmployees: 0,
      priority: 2,
      approach: "Consta no quadro societário público. Assina contrato de licença.",
    },
    {
      category: "marketing",
      title: "Diretor / Gerente Comercial",
      minEmployees: 12,
      priority: 1,
      approach:
        "É a dor dele: equipe de vendas sem carteira nova. Mostre quantos clientes potenciais existem na praça que ele já atende.",
    },
    {
      category: "operacoes",
      title: "Coordenador de Vendas / Supervisor de Equipe",
      minEmployees: 25,
      priority: 3,
      approach:
        "Quem sofre com roteiro de visita mal feito. Bom para demonstração — vira defensor interno.",
    },
    {
      category: "diretor",
      title: "Diretoria / Sócio-diretor",
      minEmployees: 60,
      priority: 4,
      approach: "Em operação grande, a decisão sobe para a diretoria e passa por orçamento anual.",
    },
    {
      category: "gerente_compras",
      title: "Gerente de Compras",
      minEmployees: 40,
      priority: 6,
      approach:
        "Cuida da mercadoria de revenda, não de software. Só entra para formalizar o pedido.",
    },
  ],

  scoreFactors: [
    {
      key: "forca-vendas",
      label: "Tamanho da força de vendas",
      maxPoints: 30,
      evaluate: ({ employeesEstimate, company }) => {
        // Quanto mais vendedor na rua, mais o produto vale — a licença escala
        // por usuário e a dor de carteira nova é proporcional ao time.
        const p =
          employeesEstimate >= 80 ? 30 :
          employeesEstimate >= 40 ? 25 :
          employeesEstimate >= 20 ? 19 :
          employeesEstimate >= 8 ? 12 : 6;
        return {
          points: p,
          detail: `~${employeesEstimate} funcionários · ${company.porte ?? "porte n/d"} — estimativa de equipe comercial`,
        };
      },
    },
    {
      key: "cobertura",
      label: "Cobertura e estrutura",
      maxPoints: 15,
      evaluate: ({ company }) => {
        let p = company.unitsCount > 1 ? Math.min(10, 4 + company.unitsCount) : 4;
        if ((company.capitalSocial ?? 0) >= 500_000) p += 5;
        else if ((company.capitalSocial ?? 0) >= 150_000) p += 3;
        return {
          points: Math.min(15, p),
          detail: company.unitsCount > 1 ? `${company.unitsCount} filiais` : "operação de unidade única",
        };
      },
    },
    {
      key: "maturidade-digital",
      label: "Maturidade digital",
      maxPoints: 15,
      evaluate: ({ company }) => {
        // Quem já tem site e presença digital compra software com menos atrito.
        let p = 0;
        const sinais: string[] = [];
        if (company.website) { p += 8; sinais.push("site próprio"); }
        if (company.instagram) { p += 4; sinais.push("Instagram ativo"); }
        if (company.email) { p += 3; sinais.push("e-mail corporativo"); }
        return {
          points: Math.min(15, p),
          detail: sinais.length ? sinais.join(", ") : "nenhuma presença digital encontrada",
        };
      },
    },
    {
      key: "decisor",
      label: "Decisor identificado",
      maxPoints: 25,
      evaluate: ({ namedDecisionMakers, bestRoleCategory }) => {
        if (namedDecisionMakers === 0) {
          return { points: 5, detail: "apenas cargo provável inferido pelo porte" };
        }
        const bonus = bestRoleCategory === "marketing" || bestRoleCategory === "diretor" ? 5 : 0;
        return {
          points: Math.min(25, (namedDecisionMakers >= 2 ? 18 : 15) + bonus),
          detail: `${namedDecisionMakers} decisor(es) com nome em fonte pública`,
        };
      },
    },
    {
      key: "maturidade",
      label: "Tempo de mercado",
      maxPoints: 15,
      evaluate: ({ company }) => {
        if (!company.openedAt) return { points: 5, detail: "data de abertura não disponível" };
        const anos = (Date.now() - new Date(company.openedAt).getTime()) / (365.25 * 24 * 3600 * 1000);
        const p = anos >= 15 ? 15 : anos >= 8 ? 13 : anos >= 3 ? 10 : 6;
        return { points: p, detail: `${Math.round(anos)} anos de operação` };
      },
    },
  ],

  // Aqui o "potencial" é assinatura mensal de software/dados, não pedido de
  // mercadoria — a ordem de grandeza é outra.
  estimateValue: (company) => {
    const base = 400;
    const porteMult =
      company.porte === "DEMAIS" ? 5 : company.porte === "EPP" ? 3 : company.porte === "ME" ? 1.8 : 1;
    return Math.round((base * porteMult * Math.max(1, company.unitsCount * 0.7)) / 50) * 50;
  },

  labels: {
    companyPlural: "distribuidores",
    volumeSignal: "porte da operação",
    buyerHint:
      "Aqui você não vende utensílio — vende carteira nova. Fale com o comercial: a dor é vendedor sem cliente novo para visitar.",
  },
};
