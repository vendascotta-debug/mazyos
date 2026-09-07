import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";

/**
 * Casca do painel administrativo.
 *
 * O `requireAdmin` aqui é a proteção que vale. O middleware só faz a triagem
 * barata no Edge (existe cookie?) — ele não sabe quem é admin, porque isso
 * exigiria consultar o banco.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  const abas = [
    { href: "/admin", label: "Visão geral" },
    { href: "/admin/clientes", label: "Clientes" },
    { href: "/admin/cobranca", label: "Cobrança" },
  ];

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-ink-900">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-5 py-3">
          <Link href="/admin" className="text-white">
            <Logo size={24} mono />
          </Link>
          <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-bold text-ink-900">
            ADMIN
          </span>

          <nav className="flex gap-1">
            {abas.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-[8px] px-3 py-1.5 text-sm text-ink-300 hover:bg-white/10 hover:text-white"
              >
                {a.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-400 sm:inline">{user.email}</span>
            <Link href="/app" className="text-sm font-medium text-white hover:underline">
              Voltar ao painel
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
