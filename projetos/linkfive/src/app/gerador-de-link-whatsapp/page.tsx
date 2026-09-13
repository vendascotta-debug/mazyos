import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronDown, Instagram, Mail, Megaphone, QrCode, Store } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { GeradorHero } from "@/components/landing/GeradorHero";
import { Analytics } from "@/components/ui/Analytics";
import { FerramentaWhatsAppJsonLd } from "@/components/seo/JsonLd";
import { FAQ_WHATSAPP } from "@/lib/faq-whatsapp";
import { SITE_URL } from "@/lib/seo";
import { PLANOS } from "@/lib/limites";

// ---------------------------------------------------------------------------
// POR QUE ESTA PAGINA EXISTE (13/09/2026).
//
// A landing sozinha disputa "encurtador de link", e naquela busca os dez
// primeiros sao Bitly, Canva, url.gratis e cutt.ly — dominios de dez anos.
// Dominio novo nao entra ali, e mesmo se entrasse o trafego seria ruim: quem
// procura encurtador gratis nao assina SaaS.
//
// "gerar link de whatsapp com mensagem pronta" e outra historia. A primeira
// pagina e de Kommo, Walink, ChatPro, Talqui e localpartner — concorrentes do
// nosso tamanho — e a intencao bate exatamente com o produto: quem gera link
// de WhatsApp e quem vende por WhatsApp.
//
// O gerador ja existia na home, enterrado numa aba. Aqui ele ganha endereco,
// titulo e o conteudo que a busca espera. Nao e pagina de venda com ferramenta
// no topo: e a ferramenta, com a venda como consequencia.
// ---------------------------------------------------------------------------

const TITULO = "Gerador de Link do WhatsApp Grátis com Mensagem Pronta";
const DESCRICAO =
  "Crie seu link do WhatsApp em segundos, com a mensagem já digitada e QR Code. " +
  "Sem cadastro. Use na bio do Instagram, no anúncio, no cartão e no balcão.";

export const metadata: Metadata = {
  // `absolute` pula o template "%s — LINKFIVE" do layout. Com ele o titulo
  // passaria de 60 caracteres e o Google cortaria justamente "com Mensagem
  // Pronta", que e metade do termo de busca. Numa pagina de ferramenta a marca
  // no titulo vale menos que o termo.
  title: { absolute: TITULO },
  description: DESCRICAO,
  alternates: { canonical: "/gerador-de-link-whatsapp" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE_URL}/gerador-de-link-whatsapp`,
    type: "website",
    // `images` PRECISA estar aqui. Declarar `openGraph` na pagina substitui o
    // objeto inteiro do layout — nao mistura campo a campo — entao sem esta
    // linha a pagina sairia sem og:image nenhum e o link compartilhado no
    // WhatsApp viria sem cartao. Verificado no HTML entregue em 13/09/2026.
    images: [
      {
        url: "/og-whatsapp.png",
        width: 1200,
        height: 630,
        alt: "Gerador de link do WhatsApp do LINKFIVE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
    images: ["/og-whatsapp.png"],
  },
};

const PASSOS = [
  {
    n: "1",
    titulo: "Digite seu número com DDD",
    texto:
      "Do jeito que você fala: 11 99999-9999. O código do Brasil entra sozinho. Número de fora, escreva com o código do país na frente.",
  },
  {
    n: "2",
    titulo: "Escreva a mensagem que já vem digitada",
    texto:
      "É o que aparece no campo de texto quando a conversa abre. Quem clicou só aperta enviar — e é isso que faz a diferença entre a pessoa escrever e a pessoa desistir.",
  },
  {
    n: "3",
    titulo: "Copie o link ou baixe o QR Code",
    texto:
      "O link sai pronto para colar na bio, no anúncio ou no e-mail. O QR Code serve para o que é impresso: vitrine, balcão, cartão, adesivo do carro.",
  },
];

const ONDE_USAR = [
  {
    icone: Instagram,
    titulo: "Na bio do Instagram e do TikTok",
    texto:
      "É o único link clicável que essas redes te dão. Apontar para o WhatsApp com mensagem pronta transforma seguidor em conversa sem tela no meio.",
  },
  {
    icone: Megaphone,
    titulo: "No anúncio",
    texto:
      "Quem clica em anúncio está com pressa. O link direto corta o site, o formulário e a espera — abre a conversa e já tem o assunto escrito.",
  },
  {
    icone: QrCode,
    titulo: "No QR Code do balcão e da vitrine",
    texto:
      "O cliente aponta a câmera e a conversa abre. Funciona com a loja fechada, que é quando metade das perguntas acontece.",
  },
  {
    icone: Mail,
    titulo: "Na assinatura de e-mail e no cartão",
    texto:
      "Ninguém liga mais para o número impresso num cartão. Um link ou um QR resolve com um toque.",
  },
  {
    icone: Store,
    titulo: "No Google Meu Negócio e no site",
    texto:
      "Botão de WhatsApp no lugar de “fale conosco”. O contato chega pelo canal em que você realmente responde.",
  },
];

export default function GeradorLinkWhatsApp() {
  return (
    <div className="bg-white">
      <Analytics />
      <FerramentaWhatsAppJsonLd />

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

      {/* --- Ferramenta primeiro. Quem chegou do Google veio buscar isto. --- */}
      <section className="border-b border-ink-100 bg-ink-50 py-12">
        <div className="mx-auto grid max-w-[1120px] items-start gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <h1 className="display text-[40px] leading-[1.03] tracking-tight text-ink-900 sm:text-[52px]">
              Gerador de link do WhatsApp grátis
            </h1>
            <p className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-ink-600">
              Crie o link que abre a conversa no seu WhatsApp <strong className="text-ink-900">com a
              mensagem já digitada</strong>. Sai pronto em segundos, com QR Code, e{" "}
              <strong className="text-ink-900">sem precisar de cadastro</strong>.
            </p>
            <p className="mt-4 max-w-[540px] text-[15px] leading-relaxed text-ink-500">
              O link é curto e no nosso domínio — não é o <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[13.5px]">wa.me</code>{" "}
              cru com o seu telefone à mostra no meio do endereço.
            </p>

            <ul className="mt-7 space-y-2.5">
              {[
                "Grátis, sem cadastro e sem cartão",
                "Mensagem já digitada — o cliente só aperta enviar",
                "QR Code junto, para imprimir no balcão ou no cartão",
                "Link curto e personalizável, no lugar do wa.me com seu número",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] text-ink-600">
                  <Check size={17} className="mt-0.5 shrink-0 text-accent-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <GeradorHero
            abaInicial="whatsapp"
            titulo="Gerar link do WhatsApp"
            subtitulo={
              <>
                Número, mensagem, e pronto.{" "}
                <strong className="text-ink-900">Sem criar conta.</strong>
              </>
            }
          />
        </div>
      </section>

      {/* --- Passo a passo --- */}
      <section className="py-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="titulo-secao">Como criar seu link do WhatsApp em 3 passos</h2>
          <p className="subtitulo-secao">Leva menos tempo do que ler esta frase duas vezes.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PASSOS.map((p) => (
              <div key={p.n} className="card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {p.n}
                </span>
                <h3 className="mt-3.5 text-[16px] font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- O que e o wa.me --- */}
      <section className="border-y border-ink-100 bg-ink-50 py-14">
        <div className="mx-auto max-w-[760px] px-5">
          <h2 className="titulo-secao">O que é o link do WhatsApp (wa.me)</h2>

          <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-ink-600">
            <p>
              O WhatsApp tem um endereço oficial que abre uma conversa direto com um número, sem a
              pessoa precisar salvar o contato antes. Ele tem esta forma:
            </p>
            <pre className="overflow-x-auto rounded-[10px] border border-ink-200 bg-white p-4 text-[13.5px] text-ink-800">
              <code>https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20um%20or%C3%A7amento</code>
            </pre>
            <p>
              Três partes: o número com o código do país (55 para o Brasil) e só dígitos, sem
              parênteses nem traço; e a mensagem depois de <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[14px]">?text=</code>,
              com os espaços e acentos convertidos para o formato que a internet entende. Errar um
              dígito ou esquecer a conversão é o motivo mais comum de um link montado à mão abrir
              conversa com o número errado — ou não abrir.
            </p>
            <p className="text-ink-900">
              O gerador acima faz essa montagem para você. Mas ele faz mais uma coisa, e é ela que
              muda o resultado no fim do mês.
            </p>
          </div>
        </div>
      </section>

      {/* --- wa.me cru x link curto: o diferencial honesto --- */}
      <section className="py-14">
        <div className="mx-auto max-w-[880px] px-5">
          <h2 className="titulo-secao">Link do wa.me x link curto</h2>
          <p className="subtitulo-secao">
            Os dois abrem a mesma conversa. O que muda é tudo o que vem depois do clique.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="py-3 pr-4 font-semibold text-ink-900"> </th>
                  <th className="py-3 pr-4 font-semibold text-ink-500">wa.me cru</th>
                  <th className="py-3 font-semibold text-brand-600">Link curto do LINKFIVE</th>
                </tr>
              </thead>
              <tbody className="text-ink-600">
                {[
                  [
                    "Como aparece",
                    "wa.me/5511999999999?text=Ol%C3%A1...",
                    "linkfive.com.br/w/orcamento",
                  ],
                  ["Seu telefone no endereço", "à mostra", "escondido"],
                  ["Você sabe quantos clicaram", "não", "sim, no painel"],
                  ["Trocar o número depois", "não — é outro link", "sim, o link continua o mesmo"],
                  ["QR Code já impresso", "vira lixo se algo mudar", "continua valendo"],
                  ["Um link por campanha", "impossível distinguir", "um código para cada"],
                ].map(([rotulo, cru, curto]) => (
                  <tr key={rotulo} className="border-b border-ink-100">
                    <td className="py-3 pr-4 font-medium text-ink-900">{rotulo}</td>
                    <td className="py-3 pr-4">{cru}</td>
                    <td className="py-3 font-medium text-ink-800">{curto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-[15px] leading-relaxed text-ink-600">
            Para um link só, no perfil pessoal, o <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[14px]">wa.me</code>{" "}
            resolve. Para quem vende, a diferença aparece no dia em que você troca de número, ou no
            dia em que precisa decidir onde colocar o dinheiro do anúncio e não tem ideia de qual
            link trouxe gente.
          </p>
        </div>
      </section>

      {/* --- Onde usar --- */}
      <section className="border-y border-ink-100 bg-ink-50 py-14">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="titulo-secao">Onde colocar o seu link</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ONDE_USAR.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-50">
                  <Icone size={19} className="text-brand-600" />
                </span>
                <h3 className="mt-3.5 text-[16px] font-semibold">{titulo}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="py-14">
        <div className="mx-auto max-w-[760px] px-5">
          <h2 className="titulo-secao">Perguntas frequentes</h2>

          <div className="mt-8 space-y-2.5">
            {FAQ_WHATSAPP.map((f) => (
              // <details> nativo: o texto da resposta fica no HTML entregue,
              // com ou sem JavaScript. Ver a nota no FAQ da home.
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

      {/* --- CTA --- */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 py-16 text-white">
        <div className="mx-auto max-w-[760px] px-5 text-center">
          <h2 className="display text-[32px] leading-tight sm:text-[40px]">
            O link é grátis. Saber quem clicou também.
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-brand-100">
            Com a conta gratuita são {PLANOS.free.maxCurtosMes} links novos por mês, QR Code, código
            personalizado e as métricas de cada um. Sem cartão.
          </p>
          <Link
            href="/cadastrar"
            className="sobe-no-hover mt-8 inline-flex items-center justify-center rounded-[10px] bg-white px-6 py-3.5 text-[15px] font-semibold text-brand-700 shadow-lg"
          >
            CRIAR CONTA GRÁTIS
          </Link>
          <p className="mt-5 text-[14px] text-brand-100">
            Quer também reunir todos os seus canais num link só?{" "}
            <Link href="/" className="font-semibold text-white underline underline-offset-2">
              Veja como funciona a página do LINKFIVE
            </Link>
          </p>
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
            <Link href="/precos" className="hover:text-white">
              Preços
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
