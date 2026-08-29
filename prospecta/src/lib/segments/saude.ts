import type { SegmentConfig } from "./types";

/**
 * Segundo segmento — existe pra provar que a arquitetura é multi-segmento de
 * verdade: mesmas telas, mesmo CRM, mesmo motor de decisores, só a config muda.
 * O MVP comercial continua focado em Food Service.
 */
export const saude: SegmentConfig = {
  slug: "saude",
  name: "Saúde e Bem-estar",
  tagline: "Clínicas, laboratórios, odontologia e estética (preview)",
  emoji: "🩺",
  accent: "#0ea5e9",

  subsegments: [
    {
      slug: "clinica-medica",
      name: "Clínica médica",
      cnaes: ["8630-5/03"],
      keywords: ["clínica", "consultório médico"],
      demandWeight: 0.9,
    },
    {
      slug: "odontologia",
      name: "Odontologia",
      cnaes: ["8630-5/04"],
      keywords: ["odontologia", "dentista"],
      demandWeight: 0.85,
    },
    {
      slug: "laboratorio",
      name: "Laboratório de análises",
      cnaes: ["8640-2/02"],
      keywords: ["laboratório", "análises clínicas"],
      demandWeight: 1,
    },
    {
      slug: "estetica",
      name: "Estética e bem-estar",
      cnaes: ["9602-5/02"],
      keywords: ["estética", "spa", "bem-estar"],
      demandWeight: 0.6,
    },
  ],

  decisionRoles: [
    {
      category: "proprietario",
      title: "Proprietário / Responsável técnico",
      minEmployees: 0,
      priority: 1,
      approach: "Em clínica pequena, o responsável técnico decide a compra.",
    },
    {
      category: "socio",
      title: "Sócio-administrador",
      minEmployees: 0,
      priority: 2,
      approach: "Consta no quadro societário público.",
    },
    {
      category: "gerente_compras",
      title: "Gerente de Compras",
      minEmployees: 30,
      priority: 3,
      approach: "Estruturas maiores centralizam compras de insumos e descartáveis.",
    },
    {
      category: "operacoes",
      title: "Gerente Administrativo",
      minEmployees: 12,
      priority: 4,
      approach: "Costuma acumular suprimentos em clínicas de médio porte.",
    },
  ],

  scoreFactors: [
    {
      key: "porte",
      label: "Porte e capital",
      maxPoints: 25,
      evaluate: ({ company, employeesEstimate }) => {
        const cap = company.capitalSocial ?? 0;
        let p = cap >= 300_000 ? 12 : cap >= 80_000 ? 9 : cap >= 20_000 ? 6 : 3;
        p += employeesEstimate >= 40 ? 13 : employeesEstimate >= 15 ? 9 : employeesEstimate >= 6 ? 6 : 3;
        return {
          points: Math.min(25, p),
          detail: `~${employeesEstimate} colaboradores · capital ${cap ? `R$ ${cap.toLocaleString("pt-BR")}` : "n/d"}`,
        };
      },
    },
    {
      key: "reputacao",
      label: "Reputação pública",
      maxPoints: 20,
      evaluate: ({ company }) => {
        const r = company.reviewsCount ?? 0;
        const nota = company.rating ?? 0;
        const p = Math.min(20, (r >= 400 ? 11 : r >= 120 ? 8 : r >= 30 ? 5 : 2) + (nota >= 4.5 ? 9 : nota >= 4 ? 6 : 3));
        return { points: p, detail: `${r} avaliações · nota ${nota.toFixed(1)}` };
      },
    },
    {
      key: "subsegmento",
      label: "Fit do subsegmento",
      maxPoints: 15,
      evaluate: ({ subsegment }) => ({
        points: Math.round((subsegment?.demandWeight ?? 0.5) * 15),
        detail: subsegment?.name ?? "não classificado",
      }),
    },
    {
      key: "decisor",
      label: "Decisor identificado",
      maxPoints: 25,
      evaluate: ({ namedDecisionMakers }) => ({
        points: namedDecisionMakers >= 2 ? 25 : namedDecisionMakers === 1 ? 18 : 5,
        detail: namedDecisionMakers
          ? `${namedDecisionMakers} decisor(es) em fonte pública`
          : "apenas cargo inferido",
      }),
    },
    {
      key: "contato",
      label: "Canais de contato",
      maxPoints: 15,
      evaluate: ({ company }) => {
        let p = 0;
        if (company.phone) p += 5;
        if (company.whatsapp) p += 5;
        if (company.email) p += 4;
        if (company.website) p += 1;
        return { points: Math.min(15, p), detail: company.phone ? "contato direto disponível" : "sem telefone público" };
      },
    },
  ],

  estimateValue: (company) =>
    Math.round(((company.porte === "DEMAIS" ? 9000 : company.porte === "EPP" ? 4500 : 2000) *
      (1 + Math.min(1.5, (company.reviewsCount ?? 0) / 500))) / 50) * 50,

  labels: {
    companyPlural: "unidades",
    volumeSignal: "fluxo de pacientes estimado",
    buyerHint: "Clínica pequena: responsável técnico. Rede: compras centralizadas.",
  },
};
