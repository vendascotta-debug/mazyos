"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { LayoutDashboard, Search, Bookmark, ListChecks, KanbanSquare, Radar, LogOut } from "lucide-react";

const NAV = [
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/leads", label: "Leads", icon: Bookmark },
  { href: "/crm", label: "CRM", icon: KanbanSquare },
  { href: "/listas", label: "Listas", icon: ListChecks },
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
];

function Abas() {
  const pathname = usePathname();
  const params = useSearchParams();
  const segment = params.get("segment");
  const qs = segment ? `?segment=${segment}` : "";

  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-200 bg-white lg:hidden",
        // Respeita a barra de gestos do iPhone.
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const ativo = pathname === href || pathname.startsWith(href + "/") || (href === "/buscar" && pathname.startsWith("/empresa"));
        return (
          <Link
            key={href}
            href={href + qs}
            // 56px de altura: alvo confortável para o polegar.
            className={clsx(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              ativo ? "text-brand-600" : "text-ink-500",
            )}
          >
            <Icon size={20} strokeWidth={ativo ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ userName }: { userName: string }) {
  return (
    <>
      {/* Barra de cima: identidade e sair. */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-ink-950 px-4 py-3 lg:hidden">
        <Link href="/buscar" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500">
            <Radar size={16} className="text-white" strokeWidth={2.4} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">Prospecta</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="max-w-32 truncate text-xs text-ink-400">{userName}</span>
          <form action="/api/auth/sair" method="post">
            <button type="submit" aria-label="Sair" className="p-1.5 text-ink-400 hover:text-white">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </header>

      <Suspense fallback={null}>
        <Abas />
      </Suspense>
    </>
  );
}
