import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OrganizacaoJsonLd } from "@/components/seo/JsonLd";
import { SITE, SITE_URL, TITULO_HOME, DESCRICAO_HOME } from "@/lib/seo";

export const metadata: Metadata = {
  // `metadataBase` é o que transforma "/og-image.png" em URL absoluta. Sem
  // ele o Next emite og:image relativo, e WhatsApp, Instagram e Facebook
  // descartam a imagem sem avisar — o link sai sem cartão nenhum.
  metadataBase: new URL(SITE_URL),

  // O `template` faz as páginas internas herdarem o nome da marca no fim do
  // título sem precisar repetir a string em cada arquivo.
  title: { default: TITULO_HOME, template: "%s — LINKFIVE" },
  description: DESCRICAO_HOME,

  applicationName: SITE.nome,
  publisher: SITE.razaoSocial,

  // Sem `alternates.canonical` aqui de propósito: no App Router a página
  // filha herda o que o layout define, e um canonical no layout apontaria o
  // site inteiro para a home. Cada página declara o seu.

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sem isso o Google limita o tamanho da prévia por conta própria.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: SITE.nome,
    title: TITULO_HOME,
    description: DESCRICAO_HOME,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: "LINKFIVE — um link com WhatsApp, catálogo e captura de contato",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: TITULO_HOME,
    description: DESCRICAO_HOME,
    images: [SITE.ogImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deixa o visitante dar zoom: ler um telefone na tela importa mais que a
  // pureza do layout.
  maximumScale: 5,
  themeColor: "#1e6bff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Fontes pelo Google: Inter na interface, Instrument Serif nos títulos. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        {children}
        {/* Identidade da marca para o Google, em todas as páginas. */}
        <OrganizacaoJsonLd />
      </body>
    </html>
  );
}
