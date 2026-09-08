import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Link2,
  MessageCircle,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import { Revelar } from "@/components/landing/Revelar";

// ---------------------------------------------------------------------------
// Um link. Cinco funções.
//
// A seção que explica o nome da marca. Antes dela, "LINKFIVE" era só um nome
// bonito; depois, é uma promessa contável — cinco coisas, nessa ordem.
//
// A ordem não é decorativa: ela é a jornada de quem chega. A pessoa acha o
// link, abre os canais, fala com a empresa, vira contato salvo, vê o que está
// à venda, e o dono acompanha o que aconteceu. Por isso os cartões vêm ligados
// por seta, e não soltos numa grade: uma etapa leva à seguinte.
//
// Fica logo depois do hero de propósito. Quem rolou a primeira tela ainda está
// decidindo se isso aqui é mais um Linktree — e essa é a resposta.
// ---------------------------------------------------------------------------

const PILARES = [
  {
    n: "01",
    icone: Link2,
    recurso: "Link",
    acao: "Conecte",
    titulo: "Centralize seus canais.",
    texto:
      "Reúna WhatsApp, Instagram, TikTok, Facebook, site, catálogo e outros canais em um único link.",
  },
  {
    n: "02",
    icone: MessageCircle,
    recurso: "Chat",
    acao: "Converse",
    titulo: "Converse com quem chegou.",
    texto:
      "Facilite o contato com visitantes e clientes através de canais de comunicação rápidos e diretos.",
  },
  {
    n: "03",
    icone: UserPlus,
    recurso: "Leads",
    acao: "Capture",
    titulo: "Capture contatos.",
    texto:
      "Transforme visitantes em oportunidades capturando nome, WhatsApp, e-mail e outras informações importantes.",
  },
  {
    n: "04",
    icone: ShoppingBag,
    recurso: "Vendas",
    acao: "Converta",
    titulo: "Mostre produtos e serviços.",
    texto:
      "Apresente seus produtos, serviços, ofertas e catálogos na sua página LINKFIVE e facilite o contato para gerar vendas.",
  },
  {
    n: "05",
    icone: BarChart3,
    recurso: "Analytics",
    acao: "Analise",
    titulo: "Veja o que está funcionando.",
    texto:
      "Acompanhe visualizações, cliques, acessos e resultados para entender o comportamento dos seus visitantes.",
  },
];

/** O "5" da marca, o mesmo do logo, para a seção não inventar outro símbolo. */
function Cinco({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--color-brand-500)" />
      <path
        d="M11 9h10M11 9v6h5.5a4.5 4.5 0 1 1 0 9H12"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CincoPilares() {
  return (
    <section className="relative overflow-hidden py-16">
      {/* Um respiro azul bem claro atrás do bloco: separa a seção do branco das
          vizinhas sem precisar de outra faixa cinza, que a página já usa duas
          vezes. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-gradient-to-b from-brand-50 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1120px] px-5">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
            <Cinco size={18} />
            Cinco funções, um link só
          </span>
        </div>

        <h2 className="titulo-secao mt-4">
          Um link. <span className="text-brand-600">Cinco funções.</span>
        </h2>
        <p className="subtitulo-secao">
          Conecte seus canais, converse com seus clientes, capture oportunidades, converta vendas e
          acompanhe seus resultados em um único lugar.
        </p>

        <Revelar className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {PILARES.map(({ n, icone: Icone, recurso, acao, titulo, texto }, i) => (
            // `flex-col` com o cartão em `flex-1`: sem isso o cartão estica
            // para a altura inteira da linha da grade e empurra a seta para
            // fora, cortada pela linha de baixo.
            <div key={n} className="relative flex h-full flex-col">
              {/* `group` fica no cartão, e não no wrapper, para a seta entre os
                  cartões não reagir ao mouse — ela é ligação, não botão. */}
              <div className="card group flex-1 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-50 transition-colors group-hover:bg-brand-500">
                    <Icone size={19} className="text-brand-600 transition-colors group-hover:text-white" />
                  </span>
                  {/* O número é grande e claro: dá a contagem de longe sem
                      disputar leitura com a palavra de ação. */}
                  <span className="text-[30px] font-bold leading-none tracking-tight text-brand-500/25 transition-colors group-hover:text-brand-500/45">
                    {n}
                  </span>
                </div>

                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
                  {recurso}
                </p>
                <p className="mt-1 text-[19px] font-bold uppercase tracking-tight text-brand-600">
                  {acao}
                </p>

                <h3 className="mt-2.5 text-[14.5px] font-semibold leading-snug text-ink-900">
                  {titulo}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">{texto}</p>
              </div>

              {/* A ligação entre as etapas, e só onde ela diz a verdade.
                  Em cinco colunas a seta aponta para a direita, no vão entre os
                  cartões. Empilhado, aponta para baixo.
                  Na grade de duas colunas não há seta nenhuma: descer do 01
                  levaria ao 03, e uma seta que aponta para o cartão errado é
                  pior que nenhuma — ali a sequência fica por conta dos números.
                  O último cartão nunca tem seta: a sequência termina nele. */}
              {i < PILARES.length - 1 && (
                <>
                  <span
                    className="absolute -right-[18px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-500 lg:flex"
                    aria-hidden="true"
                  >
                    <ChevronRight size={14} />
                  </span>
                  <span
                    className="mx-auto mt-3 flex h-6 w-6 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-500 sm:hidden"
                    aria-hidden="true"
                  >
                    <ChevronDown size={14} />
                  </span>
                </>
              )}
            </div>
          ))}
        </Revelar>

        <div className="mt-12 text-center">
          <p className="mx-auto max-w-[720px] text-[19px] font-semibold leading-snug text-ink-900 sm:text-[22px]">
            Um único link para conectar, conversar, capturar, converter e analisar.
          </p>
          <Link href="/cadastrar" className="btn-brand mt-6 px-6 py-3.5 text-[15px]">
            CRIAR MEU LINKFIVE GRÁTIS
          </Link>
          <p className="mt-3 text-sm text-ink-500">
            Grátis para sempre no plano inicial. Sem cartão de crédito.
          </p>
        </div>
      </div>
    </section>
  );
}
