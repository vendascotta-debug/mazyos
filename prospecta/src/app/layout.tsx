import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { DemoBanner } from "@/components/DemoBanner";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Prospecta — prospecção B2B com decisor identificado",
  description:
    "Encontre empresas por segmento e localização, descubra quem decide a compra e organize a prospecção do primeiro contato ao fechamento.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sem sessão (login/cadastro) a moldura do app não aparece — a tela de
  // entrada não deve mostrar menu de um sistema onde ainda não se entrou.
  const user = await currentUser().catch(() => null);

  if (!user) {
    return (
      <html lang="pt-BR">
        <body className="min-h-screen">{children}</body>
      </html>
    );
  }

  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar userName={user.name ?? user.email} />
          <main className="flex-1 min-w-0">
            <DemoBanner />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
