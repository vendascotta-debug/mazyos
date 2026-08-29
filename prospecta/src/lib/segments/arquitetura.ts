import type { SegmentConfig } from "./types";

/**
 * Arquitetura, engenharia e projeto para Food Service.
 *
 * Referências de mercado: goakira.com.br (arquitetura comercial no nicho
 * alimentar), otengenharia.com.br, namesa.com.br.
 *
 * Estas empresas não são consumidoras finais — são **especificadoras**. Quem
 * desenha a cozinha decide a bancada, o fogão, a coifa e a linha de utensílio
 * antes de a obra começar. Um escritório aprovado vira pedido recorrente a
 * cada projeto novo, sem precisar disputar preço com o dono do restaurante.
 *
 * Por isso o funil aqui é diferente: o valor não está no pedido único, e sim
 * em virar fornecedor especificado na prancheta.
 */
export const arquitetura: SegmentConfig = {
  slug: "arquitetura",
  name: "Arquitetura e Projeto",
  tagline: "Escritórios e construtoras que projetam restaurantes e cozinhas",
  emoji: "📐",
  accent: "#0d9488",

  subsegments: [
    {
      slug: "arquitetura-comercial",
      name: "Arquitetura comercial (nicho alimentar)",
      cnaes: ["7111-1/00"],
      keywords: ["arquitetura comercial", "projeto de restaurante", "arquitetura food service", "arquitetura gastronômica"],
      demandWeight: 1,
    },
    {
      slug: "projetista-cozinha",
      name: "Projetista de cozinha industrial",
      cnaes: ["7111-1/00", "7112-0/00"],
      keywords: ["cozinha industrial", "layout de cozinha", "projeto de cozinha profissional", "fluxo de produção"],
      demandWeight: 1,
    },
    {
      slug: "construtora",
      name: "Construtora e engenharia de obra comercial",
      cnaes: ["4120-4/00", "7112-0/00", "4399-1/03"],
      keywords: ["construtora", "engenharia", "obra comercial", "reforma de loja", "retrofit"],
      demandWeight: 0.9,
    },
    {
      slug: "interiores",
      name: "Design de interiores e ambientação",
      cnaes: ["7410-2/02", "7111-1/00"],
      keywords: ["design de interiores", "ambientação", "decoração comercial"],
      demandWeight: 0.75,
    },
    {
      slug: "marcenaria",
      name: "Marcenaria e mobiliário sob medida",
      cnaes: ["3101-2/00", "1622-6/01"],
      keywords: ["marcenaria", "mobiliário comercial", "balcão", "sob medida"],
      demandWeight: 0.7,
    },
    {
      slug: "consultoria-gastronomica",
      name: "Consultoria gastronômica e abertura de negócio",
      cnaes: ["7020-4/00"],
      keywords: ["consultoria gastronômica", "abertura de restaurante", "montagem de operação", "food service consulting"],
      demandWeight: 0.95,
    },
  ],

  // Aqui não existe "comprador": existe quem assina a prancheta. O caminho é
  // virar fornecedor homologado do escritório, não vender um pedido avulso.
  decisionRoles: [
    {
      category: "proprietario",
      title: "Arquiteto titular / Sócio-fundador",
      minEmployees: 0,
      priority: 1,
      approach:
        "Escritório pequeno é o titular quem especifica tudo. Leve catálogo técnico com medidas e prazo de entrega — é isso que ele precisa para fechar a prancha.",
    },
    {
      category: "socio",
      title: "Sócio-arquiteto",
      minEmployees: 0,
      priority: 2,
      approach: "Consta no quadro societário público. Costuma dividir a carteira de clientes com o titular.",
    },
    {
      category: "operacoes",
      title: "Coordenador de Projetos",
      minEmployees: 8,
      priority: 3,
      approach:
        "É quem monta o caderno de especificações e cobra prazo do fornecedor. Ganhe ele e você entra em todos os projetos do escritório.",
    },
    {
      category: "suprimentos",
      title: "Comprador / Suprimentos de obra",
      minEmployees: 25,
      priority: 4,
      approach: "Em construtora, a compra de obra é centralizada e exige cadastro de fornecedor. Peça a ficha de homologação.",
    },
    {
      category: "diretor",
      title: "Diretor Técnico / Engenheiro responsável",
      minEmployees: 20,
      priority: 4,
      approach: "Aprova substituição de item especificado — o famoso 'similar aprovado'.",
    },
    {
      category: "marketing",
      title: "Responsável Comercial / Novos Negócios",
      minEmployees: 15,
      priority: 6,
      approach: "Porta de entrada quando o titular não atende. Ofereça parceria, não venda.",
    },
  ],

  scoreFactors: [
    {
      key: "volume-projetos",
      label: "Volume de projetos estimado",
      maxPoints: 25,
      evaluate: ({ employeesEstimate, company }) => {
        // Escritório maior = mais obras por ano = mais especificação.
        const p =
          employeesEstimate >= 40 ? 25 :
          employeesEstimate >= 20 ? 21 :
          employeesEstimate >= 8 ? 16 :
          employeesEstimate >= 3 ? 11 : 6;
        return {
          points: p,
          detail: `~${employeesEstimate} profissionais · ${company.porte ?? "porte n/d"}`,
        };
      },
    },
    {
      key: "fit-nicho",
      label: "Aderência ao nicho alimentar",
      maxPoints: 20,
      evaluate: ({ subsegment }) => ({
        points: Math.round((subsegment?.demandWeight ?? 0.5) * 20),
        detail: subsegment
          ? `${subsegment.name}${subsegment.demandWeight >= 0.95 ? " — especifica equipamento de cozinha diretamente" : ""}`
          : "não classificado",
      }),
    },
    {
      key: "portfolio",
      label: "Vitrine e portfólio público",
      maxPoints: 20,
      evaluate: ({ company }) => {
        // Escritório vive de portfólio: site e Instagram são o cartão de visita
        // e também a prova de que ele atende o nicho.
        let p = 0;
        const sinais: string[] = [];
        if (company.website) { p += 9; sinais.push("site com portfólio"); }
        if (company.instagram) { p += 7; sinais.push("Instagram de projetos"); }
        if (company.linkedin) { p += 4; sinais.push("página no LinkedIn"); }
        return {
          points: Math.min(20, p),
          detail: sinais.length ? sinais.join(", ") : "sem vitrine pública encontrada",
        };
      },
    },
    {
      key: "decisor",
      label: "Decisor identificado",
      maxPoints: 20,
      evaluate: ({ namedDecisionMakers, bestRoleCategory }) => {
        if (namedDecisionMakers === 0) {
          return { points: 5, detail: "apenas cargo provável inferido" };
        }
        const bonus = bestRoleCategory === "proprietario" || bestRoleCategory === "socio" ? 4 : 0;
        return {
          points: Math.min(20, (namedDecisionMakers >= 2 ? 15 : 13) + bonus),
          detail: `${namedDecisionMakers} decisor(es) com nome em fonte pública`,
        };
      },
    },
    {
      key: "contato",
      label: "Canais de contato",
      maxPoints: 15,
      evaluate: ({ company }) => {
        let p = 0;
        if (company.whatsapp) p += 6;
        if (company.email) p += 5;
        if (company.phone) p += 3;
        if (company.linkedin) p += 1;
        return {
          points: Math.min(15, p),
          detail: company.whatsapp || company.email ? "contato direto disponível" : "só canais indiretos",
        };
      },
    },
  ],

  // O valor não é um pedido: é o que a especificação dele gera por ano.
  estimateValue: (company) => {
    const base = 2500;
    const porteMult =
      company.porte === "DEMAIS" ? 6 : company.porte === "EPP" ? 3.5 : company.porte === "ME" ? 2 : 1;
    return Math.round((base * porteMult) / 100) * 100;
  },

  labels: {
    companyPlural: "escritórios e construtoras",
    volumeSignal: "volume de projetos estimado",
    buyerHint:
      "Especificador, não comprador: o objetivo é entrar no caderno de especificações. Ofereça catálogo técnico, amostra e prazo — não desconto.",
  },
};
