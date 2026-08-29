"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { LayoutDashboard, Search, Bookmark, ListChecks, KanbanSquare, Radar, LogOut } from "lucide-react";

const NAV = [
  { href: "/buscar", label: "Buscar empresas", icon: Search },
  { href: "/leads", label: "Meus leads", icon: Bookmark },
  { href: "/listas", label: "Listas", icon: ListChecks },
  { href: "/crm", label: "CRM", icon: KanbanSquare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function Nav() {
  const pathname = usePathname();
  const params = useSearchParams();
  // O segmento acompanha a navegação: trocar de mercado não perde a tela atual.
  const segment = params.get("segment");
  const qs = segment ? `?segment=${segment}` : "";

  return (
    <nav className="flex-1 px-3 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/") ||
          (href === "/buscar" && pathname.startsWith("/empresa"));
        return (
          <Link
            key={href}
            href={href + qs}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-white/10 text-white font-medium" : "text-ink-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon size={17} strokeWidth={2} className={active ? "text-brand-500" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ userName }: { userName: string }) {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 bg-ink-950 flex-col py-5 sticky top-0 h-screen">
      <Link href="/buscar" className="px-5 mb-7 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500">
          <Radar size={18} className="text-white" strokeWidth={2.4} />
        </span>
        <span className="text-white font-semibold tracking-tight text-[17px]">Prospecta</span>
      </Link>

      <Suspense fallback={<div className="flex-1" />}>
        <Nav />
      </Suspense>

      <div className="px-3 pt-4 mt-4 border-t border-white/10">
        <div className="px-2 pb-2">
          <p className="truncate text-xs font-medium text-white" title={userName}>{userName}</p>
          <p className="text-[11px] text-ink-500">conta pessoal</p>
        </div>
        <form action="/api/auth/sair" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={16} /> Sair
          </button>
        </form>
        <p className="mt-3 px-2 text-[11px] leading-relaxed text-ink-500">
          Dados de fontes públicas: Receita Federal, mapas abertos, sites e
          perfis públicos do LinkedIn.
        </p>
      </div>
    </aside>
  );
}
