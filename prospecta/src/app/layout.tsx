import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { DemoBanner } from "@/components/DemoBanner";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Prospecta — prospecção B2B com decisor identificado",
  description:
    "Encontre empresas por segmento e localização, descubra quem decide a compra e organize a prospecção do primeiro contato ao fechamento.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deixa o usuário dar zoom: em campo, ler um telefone na tela importa mais
  // que a pureza do layout.
  maximumScale: 5,
  themeColor: "#0b0e16",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);

  if (!user) {
    return (
      <html lang="pt-BR">
        <body className="min-h-screen">{children}</body>
      </html>
    );
  }

  const nome = user.name ?? user.email;

  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          {/* Menu lateral só no desktop; no celular, barra em cima e abas embaixo. */}
          <Sidebar userName={nome} />

          <main className="min-w-0 flex-1">
            <MobileNav userName={nome} />
            <DemoBanner />
            {/* Espaço para as abas fixas não cobrirem o fim da página. */}
            <div className="pb-20 lg:pb-0">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
