// ---------------------------------------------------------------------------
// Refinos por subsegmento.
//
// Alguns CNAEs são amplos demais para servirem de filtro sozinhos: "consultoria
// em gestão" pega qualquer consultoria, "treinamento profissional" pega
// qualquer curso livre. Nesses casos o CNAE só define o universo e o nome da
// empresa faz o recorte fino.
//
// `exigeNome`: só entra se o nome fantasia ou a razão social casar.
// `ignorar`  : CNAE amplo demais mesmo com filtro de nome — fica de fora.
// ---------------------------------------------------------------------------

export const REFINOS = {
  // Escola de gastronomia dentro de "treinamento profissional" e "ensino superior".
  gastronomia: {
    exigeNome: ["GASTRONOM", "CULINARIA", "CULINÁRIA", "CONFEITARIA", "CHEF", "COZINHA"],
  },
  // Consultoria gastronômica dentro de "consultoria em gestão empresarial".
  "consultoria-gastronomica": {
    exigeNome: ["GASTRONOM", "RESTAURANTE", "ALIMENT", "FOOD", "BAR E ", "CULINARIA"],
  },
  // Arquitetura/engenharia voltada ao comercial: sem filtro, viriam todas as
  // construtoras e escritórios de engenharia do estado.
  construtora: {
    ignorar: true,
    motivo: "CNAE 4120-4 (construção de edifícios) traz toda construtora de SP — sem relação com food service",
  },
  "projetista-cozinha": {
    exigeNome: ["COZINHA", "GASTRONOM", "FOOD", "ALIMENT", "INOX", "REFRIGERA"],
  },
  interiores: {
    exigeNome: ["INTERIOR", "ARQUITET", "DESIGN", "AMBIENT"],
  },
  marcenaria: {
    exigeNome: ["MARCENARIA", "MOVEIS", "MÓVEIS", "MOBILIARIO", "MOBILIÁRIO"],
  },
  // "Representantes de mercadorias em geral" é amplo; queremos os do setor.
  importador: {
    exigeNome: ["IMPORT", "TRADING", "ALIMENT", "FOOD", "BEBIDA"],
  },
  representante: {
    exigeNome: ["REPRESENT", "ALIMENT", "FOOD", "BEBIDA"],
  },
  // Varejo de artigos domesticos e amplo demais: pega qualquer loja de casa.
  "loja-utensilios": {
    exigeNome: ["UTENSILIO", "COZINHA", "CASA", "UTILIDADE", "MESA", "INOX", "CHEF", "GASTRONOM"],
  },
  "atacado-utensilios": {
    exigeNome: ["UTENSILIO", "COZINHA", "INOX", "EQUIPAMENTO", "GASTRONOM", "REFRIGERA", "HOTEL", "BAR"],
  },
  "importadora-utensilios": {
    exigeNome: ["IMPORT", "UTENSILIO", "COZINHA", "INOX", "CASA", "TRADING"],
  },
  // Ambulantes: volume alto e ticket baixo, fora do foco inicial.
  "food-truck": {
    ignorar: true,
    motivo: "62 mil ambulantes em SP, ticket baixo — deixar para uma segunda leva",
  },
};

/** Condição SQL extra para o subsegmento, ou null. */
export function condicaoNome(subsegmento) {
  const r = REFINOS[subsegmento];
  if (!r?.exigeNome) return null;
  const alvo = "UPPER(CONCAT(IFNULL(est.nome_fantasia,''), ' ', IFNULL(emp.razao_social,'')))";
  return `(${r.exigeNome.map((t) => `${alvo} LIKE '%${t}%'`).join(" OR ")})`;
}

export function ignorado(subsegmento) {
  return Boolean(REFINOS[subsegmento]?.ignorar);
}
