/**
 * Iniciais para o avatar de quem ainda não subiu logo.
 *
 * Pula as preposições: "Oficina do Carlos" precisa virar OC, não OD. Sem isso,
 * metade dos nomes de negócio brasileiros ("Casa de Carnes", "Bar do Zé",
 * "Móveis e Decorações") gera uma sigla que não diz nada.
 */
const LIGACOES = new Set(["de", "da", "do", "das", "dos", "e", "em", "no", "na", "a", "o"]);

export function iniciais(nome: string, quantidade = 2): string {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);

  const significativas = palavras.filter((p) => !LIGACOES.has(p.toLowerCase()));
  // Um nome que só tem ligações ("do") é melhor mostrado do que apagado.
  const usadas = (significativas.length ? significativas : palavras).slice(0, quantidade);

  return usadas.map((p) => p[0]?.toUpperCase() ?? "").join("");
}
