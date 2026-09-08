// ---------------------------------------------------------------------------
// Os 5 temas da página pública.
//
// Cada tema é só um conjunto de variáveis CSS, injetadas no <style> da página.
// Não há classe condicional espalhada pelos componentes: a página pública é a
// mesma marcação sempre, e o tema troca as cores. É o que mantém a página leve
// e o que torna barato criar tema novo depois.
//
// Nenhum deles copia o Linktree: nada de verde-limão sobre roxo, nada de botão
// pill preto sobre fundo pastel. Desde 08/09/2026 a paleta é azul.
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
      texto: "#0a1428",
      textoSuave: "#5b739c",
      cardFundo: "#ffffff",
      cardBorda: "#d5e0ef",
      botaoFundo: "#ffffff",
      botaoTexto: "#0a1428",
      botaoBorda: "#d5e0ef",
      destaque: "#1e6bff",
      destaqueTexto: "#ffffff",
      raio: "12px",
      sombra: "0 1px 2px rgba(10,20,40,.06)",
    },
  },

  noturno: {
    id: "noturno",
    nome: "Noturno",
    descricao: "Fundo escuro, botões com contorno suave.",
    indicado: "Criadores, fotógrafos, música",
    vars: {
      fundo: "linear-gradient(180deg,#0a1428 0%,#12203c 100%)",
      texto: "#f5f8fc",
      textoSuave: "#8098bd",
      cardFundo: "rgba(255,255,255,.06)",
      cardBorda: "rgba(255,255,255,.12)",
      botaoFundo: "rgba(255,255,255,.07)",
      botaoTexto: "#f5f8fc",
      botaoBorda: "rgba(255,255,255,.14)",
      destaque: "#4a85ff",
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
      fundo: "#f5f8fc",
      texto: "#0a1428",
      textoSuave: "#3f5578",
      cardFundo: "#ffffff",
      cardBorda: "#d6e4ff",
      botaoFundo: "#ffffff",
      botaoTexto: "#0a1428",
      botaoBorda: "#d5e0ef",
      destaque: "#1e6bff",
      destaqueTexto: "#ffffff",
      raio: "16px",
      sombra: "0 2px 12px rgba(10,20,40,.07)",
    },
  },

  contato: {
    id: "contato",
    nome: "Contato",
    descricao: "Botão de conversa em primeiro plano, o resto discreto.",
    indicado: "Prestadores de serviço, oficinas, corretores",
    vars: {
      fundo: "linear-gradient(180deg,#eaf2ff 0%,#ffffff 40%)",
      texto: "#0a1428",
      textoSuave: "#3f5578",
      cardFundo: "#ffffff",
      cardBorda: "#d6e4ff",
      botaoFundo: "#ffffff",
      botaoTexto: "#0846b8",
      botaoBorda: "#adc8ff",
      destaque: "#0b57e0",
      destaqueTexto: "#ffffff",
      raio: "12px",
      sombra: "0 2px 10px rgba(30,107,255,.08)",
    },
  },

  criador: {
    id: "criador",
    nome: "Criador",
    descricao: "Foto grande no topo, botões cheios e contrastados.",
    indicado: "Criadores de conteúdo, afiliados",
    vars: {
      fundo: "linear-gradient(160deg,#052a6e 0%,#1e6bff 55%,#38bdf8 160%)",
      texto: "#ffffff",
      textoSuave: "rgba(255,255,255,.75)",
      cardFundo: "rgba(255,255,255,.1)",
      cardBorda: "rgba(255,255,255,.2)",
      botaoFundo: "#ffffff",
      botaoTexto: "#052a6e",
      botaoBorda: "transparent",
      destaque: "#38bdf8",
      destaqueTexto: "#0a1428",
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
