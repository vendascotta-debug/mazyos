import type { SegmentConfig } from "./types";

const anosDeOperacao = (openedAt: string | null): number | null => {
  if (!openedAt) return null;
  const anos = (Date.now() - new Date(openedAt).getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.max(0, Math.round(anos * 10) / 10);
};

export const foodService: SegmentConfig = {
  slug: "food-service",
  name: "Food Service",
  tagline: "Restaurantes, bares, padarias, hotéis e cozinhas industriais",
  emoji: "🍽️",
  accent: "#f97316",

  subsegments: [
    {
      slug: "restaurante",
      name: "Restaurante",
      cnaes: ["5611-2/01"],
      keywords: ["restaurante", "self-service", "à la carte", "comida"],
      demandWeight: 0.95,
    },
    {
      slug: "pizzaria",
      name: "Pizzaria",
      cnaes: ["5611-2/01", "5620-1/04"],
      keywords: ["pizzaria", "pizza"],
      demandWeight: 0.9,
    },
    {
      slug: "churrascaria",
      name: "Churrascaria",
      cnaes: ["5611-2/01"],
      keywords: ["churrascaria", "rodízio", "grill"],
      demandWeight: 1,
    },
    {
      slug: "bar",
      name: "Bar e petiscaria",
      cnaes: ["5611-2/05", "5611-2/04"],
      keywords: ["bar", "boteco", "petiscaria", "choperia"],
      demandWeight: 0.75,
    },
    {
      slug: "lanchonete",
      name: "Lanchonete e fast-food",
      cnaes: ["5611-2/03"],
      keywords: ["lanchonete", "hamburgueria", "fast food", "burger"],
      demandWeight: 0.8,
    },
    {
      slug: "padaria",
      name: "Padaria e confeitaria",
      cnaes: ["4721-1/02", "1091-1/02"],
      keywords: ["padaria", "panificadora", "confeitaria"],
      demandWeight: 0.85,
    },
    {
      slug: "cafeteria",
      name: "Cafeteria",
      cnaes: ["5611-2/03"],
      keywords: ["cafeteria", "café", "coffee"],
      demandWeight: 0.6,
    },
    {
      slug: "hotel",
      name: "Hotel e pousada com A&B",
      cnaes: ["5510-8/01"],
      keywords: ["hotel", "pousada", "resort"],
      demandWeight: 0.95,
    },
    {
      slug: "cozinha-industrial",
      name: "Cozinha industrial e refeições coletivas",
      cnaes: ["5620-1/01"],
      keywords: ["refeições coletivas", "cozinha industrial", "marmitex", "catering"],
      demandWeight: 1,
    },
    {
      slug: "buffet",
      name: "Buffet e eventos",
      cnaes: ["5620-1/02"],
      keywords: ["buffet", "eventos", "festas"],
      demandWeight: 0.7,
    },
    {
      slug: "dark-kitchen",
      name: "Dark kitchen / delivery",
      cnaes: ["5620-1/04"],
      keywords: ["dark kitchen", "delivery", "cozinha oculta"],
      demandWeight: 0.65,
    },

    // --- Consumidores institucionais -------------------------------------
    // Não são "restaurantes", mas servem refeição todo dia e compram utensílio
    // e insumo em volume. Costumam ficar fora das listas de prospecção comuns,
    // o que os torna justamente o pedaço menos disputado do mercado.
    {
      slug: "hospital",
      name: "Hospital e casa de saúde (nutrição)",
      cnaes: ["8610-1/01", "8610-1/02"],
      keywords: ["hospital", "casa de saúde", "pronto-socorro", "maternidade"],
      demandWeight: 1,
    },
    {
      slug: "escola",
      name: "Escola e universidade (cantina)",
      cnaes: ["8513-9/00", "8520-1/00", "8531-7/00"],
      keywords: ["escola", "colégio", "universidade", "faculdade", "creche", "cantina"],
      demandWeight: 0.9,
    },
    {
      slug: "gastronomia",
      name: "Escola e faculdade de gastronomia",
      cnaes: ["8599-6/04", "8531-7/00", "8599-6/99"],
      keywords: ["escola de gastronomia", "faculdade de gastronomia", "curso de culinária", "confeitaria profissional", "chef school"],
      // Consumo alto e recorrente: cada turma precisa de kit próprio e a
      // reposição por quebra é constante.
      demandWeight: 1,
    },
    {
      slug: "asilo",
      name: "Casa de repouso e ILPI",
      cnaes: ["8730-1/01", "8711-5/02"],
      keywords: ["casa de repouso", "asilo", "ILPI", "residencial sênior", "clínica geriátrica"],
      demandWeight: 0.9,
    },
    {
      slug: "motel",
      name: "Motel",
      cnaes: ["5510-8/03"],
      keywords: ["motel"],
      demandWeight: 0.7,
    },
    {
      slug: "clube",
      name: "Clube e associação recreativa",
      cnaes: ["9312-3/00", "9430-8/00"],
      keywords: ["clube", "associação", "sede campestre", "grêmio"],
      demandWeight: 0.75,
    },
    {
      slug: "supermercado",
      name: "Supermercado com rotisseria",
      cnaes: ["4711-3/02", "4711-3/01"],
      keywords: ["supermercado", "mercado", "rotisseria", "hipermercado"],
      demandWeight: 0.85,
    },
    {
      slug: "industria-refeitorio",
      name: "Indústria com refeitório próprio",
      cnaes: ["5620-1/01"],
      keywords: ["indústria", "fábrica", "refeitório", "planta industrial"],
      demandWeight: 0.95,
    },
    {
      // Compra centralizada: um contrato fechado na franqueadora vira pedido
      // recorrente para toda a rede.
      slug: "franquia",
      name: "Rede e franqueadora de alimentação",
      cnaes: ["5611-2/01", "7020-4/00"],
      keywords: ["franquia", "franqueadora", "rede de restaurantes", "master franqueado"],
      demandWeight: 1,
    },
    {
      slug: "industria-alimenticia",
      name: "Indústria de alimentos (refeitório e copa)",
      cnaes: ["1091-1/01", "1052-0/00", "1053-8/00", "1122-4/99"],
      keywords: ["indústria de alimentos", "laticínio", "fábrica de sorvetes", "bebidas"],
      demandWeight: 0.9,
    },
    {
      // Planta industrial grande costuma ter refeitório e copa corporativa —
      // o comprador é de Facilities/Suprimentos, não de A&B.
      slug: "industria-farmaceutica",
      name: "Indústria farmacêutica e cosmética (refeitório)",
      cnaes: ["2121-1/01", "2110-6/00", "2063-1/00"],
      keywords: ["farmacêutica", "laboratório farmacêutico", "cosméticos", "higiene pessoal"],
      demandWeight: 0.85,
    },
    {
      slug: "sorveteria",
      name: "Sorveteria e açaí",
      cnaes: ["5611-2/03", "1053-8/00"],
      keywords: ["sorveteria", "açaí", "gelateria"],
      demandWeight: 0.5,
    },
    {
      slug: "food-truck",
      name: "Food truck e ambulante",
      cnaes: ["5612-1/00"],
      keywords: ["food truck", "trailer", "ambulante"],
      demandWeight: 0.4,
    },
    {
      slug: "resort",
      name: "Resort e spa",
      cnaes: ["5510-8/01", "9609-2/06"],
      keywords: ["resort", "spa", "hotel fazenda", "termas"],
      demandWeight: 0.95,
    },
    {
      slug: "hostel",
      name: "Hostel e apart-hotel",
      cnaes: ["5510-8/02", "5590-6/03"],
      keywords: ["hostel", "apart-hotel", "flat", "albergue"],
      demandWeight: 0.6,
    },

  ],

  // Ordem de prioridade de abordagem no Food Service: em operação pequena quem
  // compra é o dono; a partir de ~25 funcionários aparece um comprador dedicado.
  decisionRoles: [
    {
      category: "proprietario",
      title: "Proprietário",
      minEmployees: 0,
      priority: 1,
      approach:
        "Operação enxuta: o dono decide e paga. Aborde direto, no horário fora do pico (14h-17h).",
    },
    {
      category: "socio",
      title: "Sócio-administrador",
      minEmployees: 0,
      priority: 2,
      approach:
        "Sócio administrador consta no quadro societário público. É quem assina contrato de fornecimento.",
    },
    {
      category: "gerente_compras",
      title: "Gerente de Compras",
      minEmployees: 25,
      priority: 3,
      approach:
        "Porte compatível com comprador dedicado. Peça na recepção 'quem cuida das compras'.",
    },
    {
      category: "suprimentos",
      title: "Coordenador de Suprimentos",
      minEmployees: 50,
      priority: 4,
      approach: "Estrutura com almoxarifado próprio — negocie prazo e volume.",
    },
    {
      category: "ab",
      title: "Gerente de A&B (Alimentos & Bebidas)",
      minEmployees: 20,
      priority: 3,
      approach:
        "Em hotel e rede, o A&B define ficha técnica e aprova troca de fornecedor.",
    },
    {
      // Em hospital, escola, asilo e refeitório industrial, é o RT de nutrição
      // que define ficha técnica, especifica utensílio e aprova substituição —
      // Compras só executa o que ele especificou.
      category: "nutricao",
      title: "Nutricionista Responsável Técnico",
      minEmployees: 10,
      priority: 2,
      approach:
        "Em operação institucional, o RT de nutrição especifica o que Compras vai comprar. Convença ele primeiro; o pedido nasce ali.",
    },
    {
      category: "operacoes",
      title: "Gerente de Operações",
      minEmployees: 15,
      priority: 5,
      approach: "Controla custo por prato. Bom canal quando o dono não atende.",
    },
    {
      category: "operacoes",
      title: "Governanta / Chefe de Andares",
      minEmployees: 12,
      priority: 6,
      approach:
        "Em hotel e motel, a governanta controla o enxoval e a reposição de utensílio do frigobar e da copa.",
    },
    {
      // Em planta industrial grande, o refeitório e a copa são contrato de
      // Facilities — não passam por A&B nem pelo dono.
      category: "operacoes",
      title: "Coordenador de Facilities / Serviços Gerais",
      minEmployees: 80,
      priority: 4,
      approach:
        "Em indústria, quem administra refeitório e copa é Facilities. Entre por ele antes de Compras.",
    },
    {
      category: "financeiro",
      title: "Responsável Financeiro",
      minEmployees: 30,
      priority: 6,
      approach: "Entra na etapa de cotação/prazo de pagamento, raramente na abertura.",
    },
  ],

  scoreFactors: [
    {
      key: "porte",
      label: "Porte e capital",
      maxPoints: 18,
      evaluate: ({ company, employeesEstimate }) => {
        let p = 0;
        const cap = company.capitalSocial ?? 0;
        if (cap >= 500_000) p += 9;
        else if (cap >= 150_000) p += 7;
        else if (cap >= 50_000) p += 5;
        else if (cap >= 10_000) p += 3;
        else p += 1;

        if (employeesEstimate >= 60) p += 9;
        else if (employeesEstimate >= 25) p += 7;
        else if (employeesEstimate >= 12) p += 5;
        else if (employeesEstimate >= 5) p += 3;
        else p += 1;

        return {
          points: Math.min(18, p),
          detail: `${company.porte ?? "porte n/d"} · ~${employeesEstimate} funcionários · capital ${cap ? `R$ ${cap.toLocaleString("pt-BR")}` : "n/d"}`,
        };
      },
    },
    {
      key: "volume",
      label: "Movimento estimado",
      maxPoints: 18,
      evaluate: ({ company }) => {
        const reviews = company.reviewsCount ?? 0;
        const rating = company.rating ?? 0;
        let p = 0;
        if (reviews >= 1500) p += 11;
        else if (reviews >= 600) p += 9;
        else if (reviews >= 200) p += 7;
        else if (reviews >= 60) p += 4;
        else if (reviews > 0) p += 2;

        if (rating >= 4.5) p += 7;
        else if (rating >= 4.2) p += 6;
        else if (rating >= 3.8) p += 4;
        else if (rating > 0) p += 2;

        return {
          points: Math.min(18, p),
          detail: reviews
            ? `${reviews.toLocaleString("pt-BR")} avaliações públicas · nota ${rating.toFixed(1)}`
            : "sem avaliações públicas encontradas",
        };
      },
    },
    {
      key: "subsegmento",
      label: "Fit do subsegmento",
      maxPoints: 14,
      evaluate: ({ subsegment }) => ({
        points: Math.round((subsegment?.demandWeight ?? 0.5) * 14),
        detail: subsegment
          ? `${subsegment.name} — consumo recorrente de insumos ${subsegment.demandWeight >= 0.9 ? "alto" : subsegment.demandWeight >= 0.7 ? "médio-alto" : "médio"}`
          : "subsegmento não classificado",
      }),
    },
    {
      key: "maturidade",
      label: "Maturidade do negócio",
      maxPoints: 10,
      evaluate: ({ company }) => {
        const anos = anosDeOperacao(company.openedAt);
        if (anos === null) return { points: 3, detail: "data de abertura não disponível" };
        let p = 3;
        if (anos >= 10) p = 10;
        else if (anos >= 5) p = 9;
        else if (anos >= 2) p = 7;
        else if (anos >= 1) p = 5;
        return { points: p, detail: `${anos} anos de operação` };
      },
    },
    {
      key: "decisor",
      label: "Decisor identificado",
      maxPoints: 20,
      evaluate: ({ namedDecisionMakers, bestRoleCategory }) => {
        if (namedDecisionMakers === 0) {
          return bestRoleCategory
            ? { points: 6, detail: "só cargo provável inferido, sem nome público" }
            : { points: 0, detail: "nenhum decisor identificado" };
        }
        const bonus =
          bestRoleCategory === "gerente_compras" ||
          bestRoleCategory === "suprimentos" ||
          bestRoleCategory === "ab"
            ? 4
            : 0;
        const base = namedDecisionMakers >= 2 ? 16 : 13;
        return {
          points: Math.min(20, base + bonus),
          detail: `${namedDecisionMakers} decisor(es) com nome em fonte pública`,
        };
      },
    },
    {
      key: "contato",
      label: "Canais de contato",
      maxPoints: 12,
      evaluate: ({ company }) => {
        let p = 0;
        const canais: string[] = [];
        if (company.phone) { p += 3; canais.push("telefone"); }
        if (company.whatsapp) { p += 4; canais.push("WhatsApp"); }
        if (company.email) { p += 3; canais.push("e-mail"); }
        if (company.instagram) { p += 1; canais.push("Instagram"); }
        if (company.website) { p += 1; canais.push("site"); }
        return {
          points: Math.min(12, p),
          detail: canais.length ? canais.join(", ") : "nenhum canal público encontrado",
        };
      },
    },
    {
      key: "expansao",
      label: "Expansão e saúde cadastral",
      maxPoints: 8,
      evaluate: ({ company }) => {
        let p = 0;
        const notas: string[] = [];
        if (company.unitsCount > 1) {
          p += Math.min(4, company.unitsCount);
          notas.push(`${company.unitsCount} unidades`);
        }
        if (company.deliveryApps.length) {
          p += 2;
          notas.push(`delivery em ${company.deliveryApps.join(", ")}`);
        }
        if (company.situacao === "ATIVA") { p += 2; notas.push("CNPJ ativo"); }
        else if (company.situacao) notas.push(`CNPJ ${company.situacao.toLowerCase()}`);
        return {
          points: Math.min(8, p),
          detail: notas.length ? notas.join(" · ") : "unidade única, sem sinais de expansão",
        };
      },
    },
  ],

  estimateValue: (company) => {
    const base = 1800;
    const porteMult =
      company.porte === "DEMAIS" ? 6 : company.porte === "EPP" ? 3 : company.porte === "ME" ? 1.6 : 1;
    const volumeMult = 1 + Math.min(2, (company.reviewsCount ?? 0) / 900);
    return Math.round((base * porteMult * volumeMult * Math.max(1, company.unitsCount * 0.8)) / 50) * 50;
  },

  labels: {
    companyPlural: "estabelecimentos",
    volumeSignal: "movimento estimado",
    buyerHint:
      "No Food Service, quanto menor a operação, mais o dono compra pessoalmente. Acima de ~25 funcionários procure Compras ou A&B.",
  },
};
