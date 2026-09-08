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
import { Revelar } from "@/components/landing/Revelar";
import { BarraNumeros } from "@/components/landing/BarraNumeros";

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
      {/* ---------------------------------------------------------------------
          TOPO E HERO — fundo escuro.

          O contraste alto faz duas coisas: separa a promessa do resto da
          página e joga toda a atenção no cartão branco do gerador, que é o
          único lugar onde o visitante pode agir agora.
      --------------------------------------------------------------------- */}
      {/* Gradiente em vez de chapado: o azul-marinho puro ficava pesado, e o
          degradê para um azul um pouco mais claro embaixo dá ar à seção sem
          perder o contraste que o texto branco precisa. */}
      <div className="relative overflow-hidden bg-gradient-to-b from-ink-950 via-ink-900 to-[#123063]">
        {/* Dois halos de luz atrás do conteúdo, respirando devagar. São
            divs com blur, não imagem: nada pra baixar. */}
        <div
          className="brilho pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/30 blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="brilho pointer-events-none absolute -bottom-52 right-0 h-[460px] w-[460px] rounded-full bg-accent-500/15 blur-[130px]"
          style={{ animationDelay: "2.5s" }}
          aria-hidden="true"
        />

        <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-3.5">
            <span className="text-white">
              <Logo mono />
            </span>
            <nav className="flex items-center gap-2">
              <Link
                href="/entrar"
                className="rounded-[10px] border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Entrar
              </Link>
              <Link href="/cadastrar" className="btn-accent">
                Criar grátis
              </Link>
            </nav>
          </div>
        </header>

        <section className="relative mx-auto grid max-w-[1120px] items-center gap-10 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-20">
          <div>
            <p className="revelar visivel mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              Feito para quem vende
            </p>

            {/* O Instrument Serif só tem um peso — não dá para engrossar. A
                força vem de tamanho, entrelinha apertada e contraste: a
                terceira linha sai no ciano, que é a cor mais clara da paleta,
                com um brilho suave atrás para descolar do fundo azul. */}
            <h1 className="display text-[46px] leading-[0.98] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)] sm:text-[68px]">
              Seu link. Sua marca.
              <br />
              <span className="relative inline-block text-accent-500">
                <span
                  className="brilho pointer-events-none absolute -inset-x-4 -inset-y-2 rounded-full bg-accent-500/20 blur-[28px]"
                  aria-hidden="true"
                />
                <span className="relative">Seus clientes.</span>
              </span>
            </h1>

            <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-ink-300">
              Não é só reunir seus canais num link. É transformar quem chega em contato salvo,
              pronto pra você vender.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/cadastrar" className="btn-accent px-5 py-3 text-[15px]">
                CRIAR MINHA PÁGINA GRÁTIS
              </Link>
              <a
                href="#como-funciona"
                className="rounded-[10px] border border-white/25 px-5 py-3 text-[15px] font-medium text-white transition-colors hover:bg-white/10"
              >
                VER COMO FUNCIONA
              </a>
            </div>

            <p className="mt-4 text-sm text-ink-400">
              Grátis para sempre no plano inicial. Sem cartão de crédito.
            </p>

            <GeradorHero />
          </div>

          {/* O celular flutua devagar: dá vida sem competir com o gerador,
              que é onde o visitante precisa clicar. */}
          <div className="flutua">
            <HeroCelular />
          </div>
        </section>

        <BarraNumeros />
      </div>

      {/* --- Como funciona --- */}
      <section id="como-funciona" className="border-y border-ink-100 bg-ink-50 py-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="titulo-secao">Como funciona</h2>
          <p className="subtitulo-secao">Três passos. Nenhum deles envolve programar nada.</p>

          <Revelar className="mt-8 grid gap-4 md:grid-cols-3">
            {COMO_FUNCIONA.map((c) => (
              <div key={c.n} className="card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {c.n}
                </span>
                <h3 className="mt-3.5 text-[16px] font-semibold">{c.titulo}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{c.texto}</p>
              </div>
            ))}
          </Revelar>
        </div>
      </section>

      {/* --- Recursos --- */}
      <section className="py-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="titulo-secao">Recursos</h2>
          <p className="subtitulo-secao">
            O concorrente te dá uma lista de links. Aqui, quem chega vira contato no seu painel.
          </p>

          <Revelar className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-50">
                  <Icone size={19} className="text-brand-600" />
                </span>
                <h3 className="mt-3.5 text-[16px] font-semibold">{titulo}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{texto}</p>
              </div>
            ))}
          </Revelar>
        </div>
      </section>

      {/* --- Para quem é --- */}
      <section className="border-y border-ink-100 bg-ink-50 py-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="titulo-secao">Para quem é</h2>

          <Revelar className="mt-8 grid gap-4 md:grid-cols-3">
            {PARA_QUEM.map((g) => (
              <div key={g.grupo} className="card p-6">
                <h3 className="text-[16px] font-semibold text-brand-600">{g.grupo}</h3>
                <ul className="mt-3 space-y-2">
                  {g.itens.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-[14.5px] text-ink-600">
                      <Check size={15} className="mt-0.5 shrink-0 text-brand-400" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Revelar>
        </div>
      </section>

      {/* --- Exemplos --- */}
      <section className="py-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="titulo-secao">Exemplos de utilização</h2>

          <Revelar className="mt-8 grid gap-4 md:grid-cols-3">
            {EXEMPLOS.map((e) => (
              <div key={e.titulo} className="card border-l-4 border-l-accent-500 p-6">
                <h3 className="text-[16px] font-semibold">{e.titulo}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{e.texto}</p>
              </div>
            ))}
          </Revelar>
        </div>
      </section>

      {/* --- Planos --- */}
      <section id="planos" className="border-y border-ink-100 bg-ink-50 py-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="titulo-secao">Planos</h2>
          <p className="subtitulo-secao">
            Escolha o plano que acompanha o seu momento. Todos incluem QR Code e nenhum tem
            anúncio.
          </p>

          <TabelaPrecos checkouts={checkouts} cta="Assinar" />
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="py-14">
        <div className="mx-auto max-w-[760px] px-5">
          <h2 className="titulo-secao">Perguntas frequentes</h2>

          <div className="mt-8 space-y-2.5">
            {FAQ.map((f) => (
              // <details> em vez de acordeão em JavaScript: funciona sem script
              // e é acessível de fábrica.
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

      {/* --- CTA final: a faixa azul --- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 py-20 text-white">
        {/* Brilho difuso no canto, o mesmo recurso do hero — dá profundidade
            ao azul chapado sem imagem nenhuma. */}
        <div
          className="brilho pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-accent-500/25 blur-[110px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[760px] px-5 text-center">
          <h2 className="display text-[36px] leading-tight sm:text-[44px]">
            Cada visita que some
            <br />
            é um cliente perdido.
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-brand-100">
            Crie sua página em um minuto e comece a guardar contato ainda hoje. Grátis, sem cartão.
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
          <Logo size={24} mono />
          <nav className="flex flex-wrap items-center gap-4 text-sm text-ink-400">
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
