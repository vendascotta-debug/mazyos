import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronDown, Minus } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Analytics } from "@/components/ui/Analytics";
import { TabelaPrecos } from "@/components/landing/TabelaPrecos";
import { PrecosJsonLd } from "@/components/seo/JsonLd";
import { FAQ_PRECOS } from "@/lib/faq-precos";
import { ORDEM_PLANOS, PLANOS } from "@/lib/limites";
import { checkoutDoPlano } from "@/lib/cobranca";
import { SITE_URL } from "@/lib/seo";

// ---------------------------------------------------------------------------
// POR QUE ESTA PAGINA EXISTE (13/09/2026).
//
// Ate hoje os botoes de plano saiam da landing direto para o checkout do
// Stripe. Isso custava duas coisas:
//
// 1. Uma URL. "linkfive preco", "linkfive quanto custa", "linkfive vale a
//    pena" sao buscas de quem JA decidiu avaliar — o trafego mais barato de
//    converter que existe — e nao havia pagina para responder.
// 2. A ultima objecao. Quem vai de tabela para checkout sem passar por
//    "posso cancelar?" e "e se eu me arrepender?" desiste no formulario de
//    cartao, e ninguem fica sabendo.
//
// A comparacao completa tambem sai daqui, e nao da landing, de proposito: na
// home ela roubaria a atencao de quem ainda nao sabe o que o produto faz.
// ---------------------------------------------------------------------------

/** R$ por mes no ciclo anual do plano de entrada, calculado — nunca escrito. */
const MENSAL_NO_ANUAL = (PLANOS.starter.precoAnualCents! / 100 / 12)
  .toFixed(2)
  .replace(".", ",");

// Preco no titulo levanta o CTR em busca de "quanto custa", e sai de PLANOS:
// titulo com preco escrito a mao e a primeira coisa a mentir quando a tabela
// muda. Com o `absolute` o template "— LINKFIVE" do layout nao entra, senao
// passaria de 60 caracteres.
const TITULO = `Preços e Planos do LINKFIVE — a partir de R$ ${MENSAL_NO_ANUAL}/mês`;
const DESCRICAO =
  `Planos do LINKFIVE a partir de R$ ${MENSAL_NO_ANUAL} por mês. Plano grátis para sempre, ` +
  "sem cartão. Cancele quando quiser, 7 dias para desistir, e sem anúncio em nenhum plano.";

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO,
  alternates: { canonical: "/precos" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE_URL}/precos`,
    type: "website",
    // Obrigatorio: declarar `openGraph` aqui substitui o objeto inteiro do
    // layout. Sem esta linha a pagina sai sem og:image.
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "LINKFIVE" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
    images: ["/og-image.png"],
  },
};

/**
 * A comparacao completa, linha a linha.
 *
 * Cada linha le PLANOS — nenhum numero escrito a mao. Tabela de preco que
 * mente e pior do que tabela de preco nenhuma, e a unica forma de ela nao
 * mentir e nao existir uma segunda copia dos numeros.
 */
const LINHAS: { rotulo: string; valor: (p: (typeof PLANOS)[keyof typeof PLANOS]) => React.ReactNode }[] = [
  { rotulo: "Páginas", valor: (p) => p.maxPaginas.toLocaleString("pt-BR") },
  {
    rotulo: "Links diretos ativos",
    valor: (p) => (p.maxCurtos === null ? "ilimitados" : p.maxCurtos.toLocaleString("pt-BR")),
  },
  {
    rotulo: "Links diretos novos por mês",
    valor: (p) => (p.maxCurtosMes === null ? "ilimitados" : p.maxCurtosMes.toLocaleString("pt-BR")),
  },
  {
    rotulo: "Histórico de métricas",
    valor: (p) =>
      p.analyticsDias >= 365 ? "1 ano" : p.analyticsDias >= 60 ? "60 dias" : `${p.analyticsDias} dias`,
  },
  { rotulo: "Pessoas na conta", valor: (p) => (p.maxMembros === 1 ? "1" : p.maxMembros.toString()) },
  { rotulo: "QR Code", valor: () => true },
  { rotulo: "Código personalizado", valor: () => true },
  { rotulo: "Sem anúncios", valor: () => true },
  { rotulo: "Formulário de captura e painel de leads", valor: (p) => p.formularios },
  { rotulo: "De onde veio a visita e em que aparelho", valor: (p) => p.metricasDetalhadas },
  { rotulo: "País de origem da visita", valor: (p) => p.metricasGeo },
  { rotulo: "Senha, expiração e troca de destino no link", valor: (p) => p.gestaoLinks },
  { rotulo: "Temas da página", valor: (p) => p.temas },
  { rotulo: "Catálogo em PDF hospedado aqui", valor: (p) => p.catalogoPdf },
  { rotulo: "Cores, fontes e formato de botão", valor: (p) => p.personalizacaoAvancada },
  { rotulo: "Página sem a assinatura do LINKFIVE", valor: (p) => !p.marca },
];

function Celula({ valor }: { valor: React.ReactNode }) {
  if (valor === true) return <Check size={17} className="mx-auto text-accent-500" aria-label="Incluído" />;
  if (valor === false) return <Minus size={17} className="mx-auto text-ink-300" aria-label="Não incluído" />;
  return <span className="text-[14px] text-ink-700">{valor}</span>;
}

export default function Precos() {
  const checkouts: Record<string, { mensal: string | null; anual: string | null }> = {};
  for (const id of ORDEM_PLANOS) {
    checkouts[id] = { mensal: checkoutDoPlano(id, "mensal"), anual: checkoutDoPlano(id, "anual") };
  }

  return (
    <div className="bg-white">
      <Analytics />
      <PrecosJsonLd />

      <header className="border-b border-ink-100">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-3.5">
          <Link href="/" className="text-ink-900">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/entrar"
              className="rounded-[10px] border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300"
            >
              Entrar
            </Link>
            <Link href="/cadastrar" className="btn-brand px-4 py-2.5 text-sm">
              Criar grátis
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-ink-50 py-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <div className="mx-auto max-w-[640px] text-center">
            <h1 className="display text-[40px] leading-[1.05] tracking-tight text-ink-900 sm:text-[52px]">
              Preços do LINKFIVE
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-600">
              Preço em real, cobrança no Brasil e um plano gratuito que não tem prazo para acabar.
              Nenhum plano exibe anúncio na sua página — nem o de graça.
            </p>
          </div>

          <TabelaPrecos checkouts={checkouts} cta="Assinar" />

          <p className="mt-6 text-center text-[14px] text-ink-500">
            Cancele quando quiser, sem multa. 7 dias para desistir e receber o dinheiro de volta.
          </p>
        </div>
      </section>

      {/* --- Comparacao completa --- */}
      <section className="py-14">
        <div className="mx-auto max-w-[880px] px-5">
          <h2 className="titulo-secao">O que muda de um plano para o outro</h2>
          <p className="subtitulo-secao">Tudo, linha a linha, sem letra miúda.</p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink-200">
                  <th className="py-3 pr-4 text-[14px] font-semibold text-ink-900">Recurso</th>
                  {ORDEM_PLANOS.map((id) => (
                    <th key={id} className="px-3 py-3 text-center text-[14px] font-semibold text-ink-900">
                      {PLANOS[id].nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LINHAS.map((linha) => (
                  <tr key={linha.rotulo} className="border-b border-ink-100">
                    <td className="py-3 pr-4 text-[14.5px] text-ink-700">{linha.rotulo}</td>
                    {ORDEM_PLANOS.map((id) => (
                      <td key={id} className="px-3 py-3 text-center">
                        <Celula valor={linha.valor(PLANOS[id])} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --- FAQ: as objecoes que travam a assinatura --- */}
      <section className="border-y border-ink-100 bg-ink-50 py-14">
        <div className="mx-auto max-w-[760px] px-5">
          <h2 className="titulo-secao">Perguntas sobre cobrança</h2>

          <div className="mt-8 space-y-2.5">
            {FAQ_PRECOS.map((f) => (
              <details key={f.p} className="card group p-5">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-[16px] font-medium">
                  {f.p}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 py-16 text-white">
        <div className="mx-auto max-w-[760px] px-5 text-center">
          <h2 className="display text-[32px] leading-tight sm:text-[40px]">
            Comece de graça. Decida depois.
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-brand-100">
            Você não precisa escolher plano agora — crie a página, veja funcionando e só então pense
            em assinar. Sem cartão de crédito.
          </p>
          <Link
            href="/cadastrar"
            className="sobe-no-hover mt-8 inline-flex items-center justify-center rounded-[10px] bg-white px-6 py-3.5 text-[15px] font-semibold text-brand-700 shadow-lg"
          >
            CRIAR MINHA PÁGINA GRÁTIS
          </Link>
        </div>
      </section>

      <footer className="bg-ink-950 py-8 text-white">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5">
          <Link href="/">
            <Logo size={24} mono />
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-ink-400">
            <Link href="/" className="hover:text-white">
              Início
            </Link>
            <Link href="/gerador-de-link-whatsapp" className="hover:text-white">
              Gerador de link do WhatsApp
            </Link>
            <Link href="/termos" className="hover:text-white">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="hover:text-white">
              Privacidade
            </Link>
          </nav>
          <p className="text-sm text-ink-500">
            © {new Date().getFullYear()} LINKFIVE. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
