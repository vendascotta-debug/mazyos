"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Lock } from "lucide-react";
import type { Page, PageLink } from "@/lib/types";
import type { Tema } from "@/lib/temas";
import { PreviewCelular } from "@/components/editor/PreviewCelular";

export function SeletorTema({
  page: pageInicial,
  links,
  temas,
  podeTrocar,
  nomePlano,
}: {
  page: Page;
  links: PageLink[];
  temas: Tema[];
  podeTrocar: boolean;
  nomePlano: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(pageInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(temaId: string) {
    // Troca o preview na hora; a gravação vai atrás. Esperar o servidor pra
    // mostrar a cor nova faria a escolha de tema parecer lenta.
    const antes = page.themeId;
    setPage((p) => ({ ...p, themeId: temaId }));
    setErro(null);
    setSalvando(true);

    try {
      const r = await fetch("/api/pagina", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageId: page.id, themeId: temaId }),
      });
      if (!r.ok) {
        const d = await r.json();
        setPage((p) => ({ ...p, themeId: antes }));
        setErro(d.erro ?? "Não foi possível trocar o tema.");
        return;
      }
      router.refresh();
    } catch {
      setPage((p) => ({ ...p, themeId: antes }));
      setErro("Falha de conexão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        {!podeTrocar && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[14px] border border-brand-200 bg-brand-50 px-4 py-3.5">
            <p className="flex-1 text-sm text-ink-700">
              O plano {nomePlano} usa o tema Clean. A escolha de tema entra a partir do Starter.
            </p>
            <Link href="/app/planos" className="btn-brand">
              Ver planos
            </Link>
          </div>
        )}

        {erro && <p className="erro mb-3">{erro}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          {temas.map((t) => {
            const ativo = page.themeId === t.id;
            const bloqueado = !podeTrocar && t.id !== "clean";

            return (
              <button
                key={t.id}
                onClick={() => !bloqueado && escolher(t.id)}
                disabled={bloqueado || salvando}
                className={`relative overflow-hidden rounded-[14px] border p-4 text-left transition-colors ${
                  ativo ? "border-brand-500 ring-2 ring-brand-100" : "border-ink-200 bg-white"
                } ${bloqueado ? "cursor-not-allowed opacity-60" : "hover:border-brand-400"}`}
              >
                {/* Amostra real das cores do tema, não um quadradinho genérico. */}
                <div
                  className="mb-3 flex h-16 items-center justify-center gap-1.5 rounded-[10px] px-3"
                  style={{ background: t.vars.fundo }}
                >
                  <span
                    className="h-5 flex-1 rounded"
                    style={{
                      background: t.vars.botaoFundo,
                      border: `1px solid ${t.vars.botaoBorda}`,
                      borderRadius: t.vars.raio === "999px" ? "999px" : "6px",
                    }}
                  />
                  <span
                    className="h-5 flex-1 rounded"
                    style={{
                      background: t.vars.destaque,
                      borderRadius: t.vars.raio === "999px" ? "999px" : "6px",
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <p className="font-semibold">{t.nome}</p>
                  {ativo && <Check size={15} className="text-brand-500" />}
                  {bloqueado && <Lock size={13} className="text-ink-400" />}
                </div>
                <p className="mt-0.5 text-sm text-ink-500">{t.descricao}</p>
                <p className="mt-1.5 text-xs text-ink-400">{t.indicado}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:sticky lg:top-[76px] lg:self-start">
        <PreviewCelular page={page} links={links} />
      </div>
    </div>
  );
}
