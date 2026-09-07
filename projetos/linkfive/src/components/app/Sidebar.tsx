"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Link2,
  Zap,
  Palette,
  QrCode,
  Settings,
  Sparkles,
  UserSquare2,
  Users,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const ITENS = [
  { href: "/app", label: "Dashboard", icone: LayoutDashboard },
  { href: "/app/pagina", label: "Minha Página", icone: UserSquare2 },
  { href: "/app/curtos", label: "Links diretos", icone: Zap },
  { href: "/app/links", label: "Links", icone: Link2 },
  { href: "/app/leads", label: "Leads", icone: Users },
  { href: "/app/analytics", label: "Analytics", icone: BarChart3 },
  { href: "/app/qrcode", label: "QR Code", icone: QrCode },
  { href: "/app/aparencia", label: "Aparência", icone: Palette },
  { href: "/app/planos", label: "Planos", icone: Sparkles },
  { href: "/app/config", label: "Configurações", icone: Settings },
];

/** No celular, os 5 principais viram abas fixas embaixo. */
const PRINCIPAIS = ["/app", "/app/pagina", "/app/curtos", "/app/analytics", "/app/qrcode"];

export function Sidebar() {
  const path = usePathname();
  const ativo = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

  return (
    <>
      <aside className="hidden w-[236px] shrink-0 border-r border-ink-200 bg-white lg:block">
        <div className="px-5 py-5">
          <Link href="/app">
            <Logo />
          </Link>
        </div>

        <nav className="px-3 pb-6">
          {ITENS.map(({ href, label, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              className={`mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors ${
                ativo(href)
                  ? "bg-brand-50 font-semibold text-brand-700"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              <Icone size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-200 bg-white lg:hidden">
        {ITENS.filter((i) => PRINCIPAIS.includes(i.href)).map(({ href, label, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
              ativo(href) ? "font-semibold text-brand-600" : "text-ink-500"
            }`}
          >
            <Icone size={19} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
