"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { normalizarSlug } from "@/lib/slug";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? "linkfive.com.br";

/**
 * Troca do endereço da página.
 *
 * Fica em Configurações, e não no editor, de propósito: mudar o slug quebra
 * todo QR Code impresso e todo link já compartilhado. É uma decisão rara e
 * cara, não um campo pra se mexer sem querer enquanto edita a bio.
 */
export function FormEndereco({ pageId, slugAtual }: { pageId: string; slugAtual: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState(slugAtual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const mudou = slug !== slugAtual;

  async function salvar() {
    if (!mudou) return;
    if (
      !confirm(
        "Ao trocar o endereço, o link antigo para de funcionar e todo QR Code já impresso deixa de abrir sua página. Continuar?",
      )
    ) {
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/pagina", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageId, slug }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível trocar o endereço.");
        return;
      }
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
      router.refresh();
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold">Endereço da página</h2>
      <p className="mt-1 text-sm text-ink-500">É o link que você divulga.</p>

      <div className="mt-4 flex items-center rounded-[10px] border border-ink-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <span className="pl-3.5 text-sm text-ink-400">{SITE}/</span>
        <input
          className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm outline-none"
          value={slug}
          onChange={(e) => setSlug(normalizarSlug(e.target.value))}
        />
      </div>

      {mudou && (
        <p className="mt-2.5 flex items-start gap-2 rounded-[10px] bg-accent-100 px-3.5 py-2.5 text-sm text-ink-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          O endereço antigo para de funcionar, e os QR Codes já impressos deixam de abrir sua
          página.
        </p>
      )}

      {erro && <p className="erro">{erro}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button onClick={salvar} className="btn-brand" disabled={!mudou || salvando}>
          {salvando && <Loader2 size={16} className="animate-spin" />}
          Salvar endereço
        </button>
        {salvo && (
          <span className="flex items-center gap-1.5 text-sm text-ok-500">
            <Check size={15} /> Endereço atualizado
          </span>
        )}
      </div>
    </section>
  );
}
