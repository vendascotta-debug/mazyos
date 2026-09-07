"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { iniciais as calcularIniciais } from "@/lib/iniciais";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function Topbar({
  nome,
  avatarUrl,
  plano,
  slug,
  publicada,
}: {
  nome: string;
  avatarUrl: string | null;
  plano: string;
  slug: string | null;
  publicada: boolean;
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const url = slug ? `${SITE}/${slug}` : null;

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem permissão de área de transferência: o link segue visível na tela.
    }
  }

  async function sair() {
    await fetch("/api/auth/sair", { method: "POST" });
    router.push("/entrar");
    router.refresh();
  }

  const iniciais = calcularIniciais(nome);

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-5 py-3">
      <Link href="/app" className="lg:hidden">
        <Logo size={24} />
      </Link>

      {url && (
        <div className="order-3 flex min-w-0 flex-1 items-center gap-1.5 lg:order-none">
          <button
            onClick={copiar}
            className="flex min-w-0 items-center gap-2 rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-1.5 text-sm text-ink-700 hover:border-brand-300"
            title="Copiar link"
          >
            <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
            {copiado ? (
              <Check size={14} className="shrink-0 text-ok-500" />
            ) : (
              <Copy size={14} className="shrink-0 text-ink-400" />
            )}
          </button>

          <a
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost px-2.5 py-1.5"
            title="Visualizar página"
          >
            <ExternalLink size={15} />
            <span className="hidden sm:inline">Ver página</span>
          </a>

          <span
            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${
              publicada ? "bg-ok-500/10 text-ok-500" : "bg-accent-100 text-warn-500"
            }`}
          >
            {publicada ? "No ar" : "Rascunho"}
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/app/planos"
          className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700"
        >
          {plano}
        </Link>

        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={nome} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
            {iniciais || "?"}
          </span>
        )}

        <button onClick={sair} className="text-ink-400 hover:text-danger-500" title="Sair">
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
