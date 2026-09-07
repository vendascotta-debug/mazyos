import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { paginaDoUsuario } from "@/lib/repo";
import { plano } from "@/lib/limites";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";

/**
 * Casca da área logada.
 *
 * O `requireUser` aqui é a proteção que vale — o middleware só faz a triagem
 * barata no Edge, sem validar assinatura. Se o cookie for forjado, é aqui que
 * ele morre.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  const p = plano(user.plan);

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          nome={user.name}
          avatarUrl={user.avatarUrl}
          plano={p.nome}
          slug={page?.slug ?? null}
          publicada={page?.published ?? false}
        />

        {/* Espaço no rodapé pras abas fixas do celular não cobrirem o conteúdo. */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">{children}</main>

        {!page && (
          <div className="mx-5 mb-6 rounded-[10px] border border-warn-500/30 bg-accent-100 px-4 py-3 text-sm text-ink-800">
            Sua conta ainda não tem página.{" "}
            <Link href="/onboarding" className="font-semibold underline">
              Criar agora
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
