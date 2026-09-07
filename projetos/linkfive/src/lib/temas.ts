// ---------------------------------------------------------------------------
// Os 5 temas da página pública.
//
// Cada tema é só um conjunto de variáveis CSS, injetadas no <style> da página.
// Não há classe condicional espalhada pelos componentes: a página pública é a
// mesma marcação sempre, e o tema troca as cores. É o que mantém a página leve
// e o que torna barato criar tema novo depois.
//
// Nenhum deles copia o Linktree: nada de verde-limão sobre roxo, nada de botão
// pill preto sobre fundo pastel.
// ---------------------------------------------------------------------------

export interface Tema {
  id: string;
  nome: string;
  descricao: string;
  /** Para quem esse tema foi desenhado — aparece no seletor. */
  indicado: string;
  vars: {
    /** Fundo da página. Aceita gradiente. */
    fundo: string;
    texto: string;
    textoSuave: string;
    cardFundo: string;
    cardBorda: string;
    botaoFundo: string;
    botaoTexto: string;
    botaoBorda: string;
    /** Cor do botão de destaque (WhatsApp e formulário). */
    destaque: string;
    destaqueTexto: string;
    raio: string;
    sombra: string;
  };
}

export const TEMAS: Record<string, Tema> = {
  clean: {
    id: "clean",
    nome: "Clean",
    descricao: "Branco, muito respiro, foco no conteúdo.",
    indicado: "Serve pra qualquer negócio",
    vars: {
      fundo: "#ffffff",
      texto: "#12121a",
      textoSuave: "#6f6f8a",
      cardFundo: "#ffffff",
      cardBorda: "#dfdfea",
      botaoFundo: "#ffffff",
      botaoTexto: "#12121a",
      botaoBorda: "#dfdfea",
      destaque: "#5b3df5",
      destaqueTexto: "#ffffff",
      raio: "12px",
      sombra: "0 1px 2px rgba(18,18,26,.06)",
    },
  },

  noturno: {
    id: "noturno",
    nome: "Noturno",
    descricao: "Fundo escuro, botões com contorno suave.",
    indicado: "Criadores, fotógrafos, música",
    vars: {
      fundo: "linear-gradient(180deg,#12121a 0%,#1c1a2e 100%)",
      texto: "#f7f7fb",
      textoSuave: "#9494ad",
      cardFundo: "rgba(255,255,255,.06)",
      cardBorda: "rgba(255,255,255,.12)",
      botaoFundo: "rgba(255,255,255,.07)",
      botaoTexto: "#f7f7fb",
      botaoBorda: "rgba(255,255,255,.14)",
      destaque: "#8a70ff",
      destaqueTexto: "#ffffff",
      raio: "12px",
      sombra: "none",
    },
  },

  vitrine: {
    id: "vitrine",
    nome: "Vitrine",
    descricao: "Cards maiores, pensados pra mostrar produto com foto.",
    indicado: "Lojas, revendas, catálogo",
    vars: {
      fundo: "#f7f7fb",
      texto: "#12121a",
      textoSuave: "#545469",
      cardFundo: "#ffffff",
      cardBorda: "#e6e0ff",
      botaoFundo: "#ffffff",
      botaoTexto: "#12121a",
      botaoBorda: "#dfdfea",
      destaque: "#5b3df5",
      destaqueTexto: "#ffffff",
      raio: "16px",
      sombra: "0 2px 12px rgba(18,18,26,.07)",
    },
  },

  contato: {
    id: "contato",
    nome: "Contato",
    descricao: "Botão de conversa em primeiro plano, o resto discreto.",
    indicado: "Prestadores de serviço, oficinas, corretores",
    vars: {
      fundo: "linear-gradient(180deg,#f2efff 0%,#ffffff 40%)",
      texto: "#12121a",
      textoSuave: "#545469",
      cardFundo: "#ffffff",
      cardBorda: "#e6e0ff",
      botaoFundo: "#ffffff",
      botaoTexto: "#3c24b8",
      botaoBorda: "#cec4ff",
      destaque: "#4a2ee0",
      destaqueTexto: "#ffffff",
      raio: "12px",
      sombra: "0 2px 10px rgba(91,61,245,.08)",
    },
  },

  criador: {
    id: "criador",
    nome: "Criador",
    descricao: "Foto grande no topo, botões cheios e contrastados.",
    indicado: "Criadores de conteúdo, afiliados",
    vars: {
      fundo: "linear-gradient(160deg,#251769 0%,#5b3df5 55%,#ffb020 160%)",
      texto: "#ffffff",
      textoSuave: "rgba(255,255,255,.75)",
      cardFundo: "rgba(255,255,255,.1)",
      cardBorda: "rgba(255,255,255,.2)",
      botaoFundo: "#ffffff",
      botaoTexto: "#251769",
      botaoBorda: "transparent",
      destaque: "#ffb020",
      destaqueTexto: "#12121a",
      raio: "999px",
      sombra: "0 4px 16px rgba(0,0,0,.12)",
    },
  },
};

export const TEMA_PADRAO = "clean";

export function tema(id: string | null | undefined): Tema {
  return TEMAS[id ?? TEMA_PADRAO] ?? TEMAS[TEMA_PADRAO];
}

/**
 * Converte o tema em variáveis CSS pro `style` da página pública.
 *
 * `overrides` são os ajustes do usuário no plano Pro (personalização
 * avançada) — eles vêm depois pra vencer o tema.
 */
export function varsCss(temaId: string, overrides: Record<string, string> = {}): string {
  return Object.entries(varsObj(temaId, overrides))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/**
 * As mesmas variáveis como objeto, para o atributo `style` do React.
 *
 * Existe porque o preview do editor precisa aplicar o tema inline, e recortar
 * a string de `varsCss` num split por ":" quebraria em qualquer valor que
 * contenha dois-pontos (uma `url(...)` de fundo, por exemplo).
 */
export function varsObj(
  temaId: string,
  overrides: Record<string, string> = {},
): Record<string, string> {
  const t = tema(temaId);
  const juntos = { ...t.vars, ...overrides } as Record<string, string>;
  return Object.fromEntries(Object.entries(juntos).map(([k, v]) => [`--lf-${k}`, v]));
}
