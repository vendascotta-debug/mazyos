// ---------------------------------------------------------------------------
// Classificador de subsegmento.
//
// O CNAE define o universo, não o subsegmento. Na Receita, restaurante,
// pizzaria e churrascaria compartilham o 5611-2/01; lanchonete, cafeteria e
// sorveteria compartilham o 5611-2/03. Quem separa é o nome do estabelecimento.
//
// Sem isso, "pizzaria" virava um balde de marmitex e churrascaria ficava vazia
// mesmo havendo centenas na base.
// ---------------------------------------------------------------------------

const semAcento = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** Regras por CNAE ambíguo: a primeira que casar no nome vence. */
const REGRAS = {
  // Restaurantes e similares
  "5611201": [
    [/PIZZ/, "pizzaria"],
    [/CHURRASC|RODIZIO|ESPETINHO|ESPETARIA|GRILL|BOI NA BRASA|STEAK/, "churrascaria"],
    [/BUFFET|BUFE|RECEPCOES|EVENTOS/, "buffet"],
    [/PADARIA|PANIFIC|CONFEITARIA/, "padaria"],
    [/CAFETERIA|COFFEE|CAFE /, "cafeteria"],
    [/HAMBURG|BURGER|LANCHONETE|LANCHES/, "lanchonete"],
    [null, "restaurante"],
  ],
  // Lanchonetes, casas de chá, de sucos e similares
  "5611203": [
    [/CAFETERIA|COFFEE|CAFE |CAFE$|TORREF/, "cafeteria"],
    [/SORVET|ACAI|GELATO|GELATERIA|MILK SHAKE/, "sorveteria"],
    [/PIZZ/, "pizzaria"],
    [/PADARIA|PANIFIC|CONFEITARIA|DOCERIA/, "padaria"],
    [null, "lanchonete"],
  ],
  // Bares com e sem entretenimento
  "5611204": [[/PIZZ/, "pizzaria"], [null, "bar"]],
  "5611205": [[null, "bar"]],
  // Fornecimento de alimentos para consumo domiciliar: é marmitex e delivery,
  // não pizzaria — era exatamente aqui que a classificação errava.
  "5620104": [
    [/PIZZ/, "pizzaria"],
    [/MARMIT|QUENTINHA|COMIDA CASEIRA/, "dark-kitchen"],
    [null, "dark-kitchen"],
  ],
  "5620101": [[null, "cozinha-industrial"]],
  "5620102": [[/COFFEE BREAK|COQUETEL/, "buffet"], [null, "buffet"]],
  // Hospedagem
  "5510801": [
    [/RESORT|SPA|HOTEL FAZENDA|TERMAS|ECO RESORT/, "resort"],
    [/HOSTEL|ALBERGUE|APART|FLAT/, "hostel"],
    [null, "hotel"],
  ],
  "5510802": [[null, "hostel"]],
  "5510803": [[null, "motel"]],
  // Padaria e confeitaria
  "4721102": [[/CONFEITARIA|DOCERIA|BOLO/, "padaria"], [null, "padaria"]],
  "1091102": [[null, "padaria"]],
  "5612100": [[null, "food-truck"]],
  "1053800": [[null, "sorveteria"]],
};

/**
 * Devolve o subsegmento correto para (CNAE, nome), ou null se o CNAE não for
 * ambíguo — nesse caso vale o mapa direto de CNAE -> subsegmento.
 */
export function classificarPorNome(cnae, nome) {
  const regras = REGRAS[cnae];
  if (!regras) return null;
  const n = semAcento(nome);
  for (const [padrao, sub] of regras) {
    if (padrao === null) return sub;
    if (padrao.test(n)) return sub;
  }
  return null;
}

export const CNAES_AMBIGUOS = Object.keys(REGRAS);
