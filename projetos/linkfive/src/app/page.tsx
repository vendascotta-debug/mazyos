import Link from "next/link";
import {
  BarChart3,
  Check,
  ChevronDown,
  MessageCircle,
  MousePointerClick,
  Palette,
  QrCode,
  Users,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ORDEM_PLANOS, PLANOS } from "@/lib/limites";
import { checkoutDoPlano } from "@/lib/cobranca";
import { TabelaPrecos } from "@/components/landing/TabelaPrecos";
import { HeroCelular } from "@/components/landing/HeroCelular";
import { GeradorHero } from "@/components/landing/GeradorHero";

// ---------------------------------------------------------------------------
// POSICIONAMENTO (revisto em 07/09/2026).
//
// "Todos os seus canais em um link" é o que Linktree, Bitly e url.gratis já
// dizem. Repetir a frase do concorrente obriga a ganhar no convencimento, que
// é caro para quem ninguém conhece ainda.
//
// A promessa daqui em diante é o que eles NÃO fazem: a página não só recebe
// visita, ela devolve o contato de quem chegou. Reunir canais virou meio; o
// fim é cliente.
// ---------------------------------------------------------------------------

export const metadata = {
  title: "LINKFIVE — Seu link. Sua marca. Seus clientes.",
  description:
    "Uma página que transforma quem chega em contato: WhatsApp com mensagem pronta, formulário de captura e os leads organizados no seu painel.",
};

const COMO_FUNCIONA = [
  {
    n: "1",
    titulo: "Monte sua página",
    texto:
      "Endereço, nome, logo e os canais que você usa. Leva menos de um minuto e não precisa saber nada de site.",
  },
  {
    n: "2",
    titulo: "Divulgue um link só",
    texto:
      "Na bio, no cartão, no anúncio, no QR Code da vitrine. Quem chegar encontra o caminho pra falar com você.",
  },
  {
    n: "3",
    titulo: "Receba o contato",
    texto:
      "A conversa abre no seu WhatsApp com a mensagem pronta, ou o contato cai no seu painel pelo formulário. Aí é só vender.",
  },
];

const RECURSOS = [
  {
    icone: Users,
    titulo: "O contato não se perde",
    texto:
      "Um formulário na sua página recolhe nome, WhatsApp e e-mail. Tudo cai organizado no seu painel — nada de anotar em papel ou caçar no meio das mensagens.",
  },
  {
    icone: MessageCircle,
    titulo: "WhatsApp com mensagem pronta",
    texto:
      "O cliente toca no botão e a conversa já abre com a mensagem digitada. Ele só aperta enviar — sem aquele silêncio de quem não sabe como começar.",
  },
  {
    icone: Zap,
    titulo: "Link direto, sem página no meio",
    texto:
      "Endereços curtos que abrem a conversa na hora. Um pro anúncio, um pro cartão, um pra vitrine — e você vê qual deles trouxe gente.",
  },
  {
    icone: BarChart3,
    titulo: "Analytics que serve para vender",
    texto:
      "Quantos abriram, quantos clicaram, quantos foram para o WhatsApp. Você sabe o que funciona.",
  },
  {
    icone: QrCode,
    titulo: "QR Code para o mundo real",
    texto:
      "Imprima na vitrine, no balcão, no cartão ou no carro. Quem aponta a câmera cai na sua página.",
  },
  {
    icone: Palette,
    titulo: "A sua cara, não a nossa",
    texto: "Cinco visuais profissionais, das cores ao formato dos botões. Nada de página genérica.",
  },
  {
    icone: MousePointerClick,
    titulo: "Preço em real, feito aqui",
    texto:
      "Sem cobrança em dólar, sem cartão internacional, sem suporte em inglês. Um produto brasileiro para quem vende no Brasil.",
  },
];

const PARA_QUEM = [
  {
    grupo: "Empresas",
    itens: ["Restaurantes", "Lojas", "Oficinas", "Imobiliárias", "Revendas de veículos", "Prestadores de serviço"],
  },
  {
    grupo: "Profissionais",
    itens: ["Corretores", "Vendedores", "Representantes", "Fotógrafos", "Consultores", "Profissionais liberais"],
  },
  {
    grupo: "Criadores e afiliados",
    itens: ["Criadores de conteúdo", "Afiliados", "Quem vive de indicação", "Quem vende por link"],
  },
];

const EXEMPLOS = [
  {
    titulo: "Oficina mecânica",
    texto:
      "Botão de WhatsApp com “quero um orçamento”, endereço no mapa, horário de funcionamento e telefone fixo. O cliente resolve tudo sem ligar.",
  },
  {
    titulo: "Loja de roupas",
    texto:
      "Catálogo, Instagram, WhatsApp da vendedora e QR Code no provador. Quem viu na loja continua comprando de casa.",
  },
  {
    titulo: "Corretor de imóveis",
    texto:
      "Um link no anúncio com WhatsApp, carteira de imóveis e formulário de interesse. Cada contato vira um lead registrado.",
  },
];

const FAQ = [
  {
    p: "Preciso saber mexer com site?",
    r: "Não. Você preenche quatro campos e sua página está no ar. Se souber usar o WhatsApp, sabe usar o LINKFIVE.",
  },
  {
    p: "Posso usar de graça?",
    // Os números saem de PLANOS, não escritos à mão: um limite alterado lá
    // corrigiria a tabela de preços e deixaria esta resposta mentindo.
    r:
      `Sim, e sem prazo para acabar. O plano gratuito dá ${PLANOS.free.maxPaginas} páginas, ` +
      `${PLANOS.free.maxCurtosMes} links diretos novos por mês, QR Code e código personalizado. ` +
      `As métricas ficam disponíveis por ${PLANOS.free.analyticsDias} dias — nos planos pagos, ` +
      `o histórico é bem maior. Sem cartão de crédito.`,
  },
  {
    p: "Vocês colocam anúncio nos meus links?",
    r: "Nunca, em nenhum plano — inclusive no gratuito. O link é seu e a página é sua; quem clica vê o que você colocou lá, e mais nada.",
  },
  {
    p: "Qual a diferença entre a página e o link direto?",
    r: "A página reúne todos os seus canais num endereço só — serve pra bio do Instagram e pro cartão. O link direto abre a conversa no WhatsApp na hora, sem tela no meio — serve pro anúncio e pro QR Code do balcão. Você usa os dois, cada um no seu lugar.",
  },
  {
    p: "Consigo mudar o endereço da página depois?",
    r: "Consegue, mas pense antes: o endereço antigo para de funcionar e os QR Codes já impressos deixam de abrir.",
  },
  {
    p: "Os contatos que eu receber são meus?",
    r: "São seus. Os leads ficam na sua conta, só você enxerga, e você pode exportar quando quiser.",
  },
  {
    p: "Funciona bem no celular?",
    r: "É onde a página mais é aberta, então é onde ela foi desenhada primeiro. O painel também funciona no celular.",
  },
];

export default function Landing() {
  // Os links de checkout saem do servidor: as URLs do Lastlink ficam em
  // variável de ambiente e trocam sem precisar de deploy.
  const checkouts: Record<string, { mensal: string | null; anual: string | null }> = {};
  for (const id of ORDEM_PLANOS) {
    checkouts[id] = { mensal: checkoutDoPlano(id, "mensal"), anual: checkoutDoPlano(id, "anual") };
  }

  return (
    <div className="bg-white">
      {/* --- Topo --- */}
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-3.5">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/entrar" className="btn-ghost">
              Entrar
            </Link>
            <Link href="/cadastrar" className="btn-brand">
              Criar grátis
            </Link>
          </nav>
        </div>
      </header>

      {/* --- Hero --- */}
      <section className="mx-auto grid max-w-[1120px] items-center gap-10 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-20">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Feito para quem vende
          </p>

          <h1 className="display text-[42px] leading-[1.06] text-ink-900 sm:text-[56px]">
            Seu link. Sua marca.
            <br />
            <span className="text-brand-500">Seus clientes.</span>
          </h1>

          <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-ink-600">
            Não é só reunir seus canais num link. É transformar quem chega em contato salvo, pronto
            pra você vender.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/cadastrar" className="btn-accent px-5 py-3 text-[15px]">
              CRIAR MINHA PÁGINA GRÁTIS
            </Link>
            <a href="#como-funciona" className="btn-ghost px-5 py-3 text-[15px]">
              VER COMO FUNCIONA
            </a>
          </div>

          <p className="mt-4 text-sm text-ink-400">
            Grátis para sempre no plano inicial. Sem cartão de crédito.
          </p>

          <GeradorHero />
        </div>

        <HeroCelular />
      </section>

      {/* --- Como funciona --- */}
      <section id="como-funciona" className="border-y border-ink-100 bg-ink-50 py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="display text-[32px] text-ink-900">Como funciona</h2>
          <p className="mt-2 text-ink-600">Três passos. Nenhum deles envolve programar nada.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {COMO_FUNCIONA.map((c) => (
              <div key={c.n} className="card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {c.n}
                </span>
                <h3 className="mt-4 font-semibold">{c.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{c.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Recursos --- */}
      <section className="py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="display text-[32px] text-ink-900">Recursos</h2>
          <p className="mt-2 text-ink-600">
            O concorrente te dá uma lista de links. Aqui, quem chega vira contato no seu painel.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-50">
                  <Icone size={19} className="text-brand-600" />
                </span>
                <h3 className="mt-4 font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Para quem é --- */}
      <section className="border-y border-ink-100 bg-ink-50 py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="display text-[32px] text-ink-900">Para quem é</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PARA_QUEM.map((g) => (
              <div key={g.grupo} className="card p-6">
                <h3 className="font-semibold text-brand-600">{g.grupo}</h3>
                <ul className="mt-3 space-y-2">
                  {g.itens.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                      <Check size={15} className="mt-0.5 shrink-0 text-brand-400" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Exemplos --- */}
      <section className="py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="display text-[32px] text-ink-900">Exemplos de utilização</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {EXEMPLOS.map((e) => (
              <div key={e.titulo} className="card border-l-4 border-l-accent-500 p-6">
                <h3 className="font-semibold">{e.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{e.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Planos --- */}
      <section id="planos" className="border-y border-ink-100 bg-ink-50 py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="display text-[32px] text-ink-900">Planos</h2>
          <p className="mt-2 text-ink-600">Comece de graça. Mude quando fizer sentido.</p>

          <TabelaPrecos checkouts={checkouts} cta="Assinar" />
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="py-16">
        <div className="mx-auto max-w-[760px] px-5">
          <h2 className="display text-[32px] text-ink-900">Perguntas frequentes</h2>

          <div className="mt-8 space-y-2.5">
            {FAQ.map((f) => (
              // <details> em vez de acordeão em JavaScript: funciona sem script
              // e é acessível de fábrica.
              <details key={f.p} className="card group p-5">
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-medium">
                  {f.p}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA final --- */}
      <section className="bg-ink-900 py-16 text-white">
        <div className="mx-auto max-w-[760px] px-5 text-center">
          <h2 className="display text-[36px] leading-tight">
            Cada visita que some
            <br />
            é um cliente perdido.
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-ink-300">
            Crie sua página em um minuto e comece a guardar contato ainda hoje. Grátis, sem cartão.
          </p>
          <Link href="/cadastrar" className="btn-accent mt-7 px-6 py-3.5 text-[15px]">
            CRIAR MINHA PÁGINA GRÁTIS
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5">
          <Logo size={24} />
          <nav className="flex flex-wrap items-center gap-4 text-sm text-ink-500">
            <Link href="/termos" className="hover:text-ink-900">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="hover:text-ink-900">
              Privacidade
            </Link>
          </nav>

          <p className="text-sm text-ink-400">
            © {new Date().getFullYear()} LINKFIVE. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
