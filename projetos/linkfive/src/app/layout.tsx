import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINKFIVE — Seu link. Sua marca. Seus clientes.",
  description:
    "Crie uma página profissional com todos os seus canais, produtos e formas de contato em um único link.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deixa o visitante dar zoom: ler um telefone na tela importa mais que a
  // pureza do layout.
  maximumScale: 5,
  themeColor: "#5b3df5",
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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
