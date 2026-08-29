"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/types";

/**
 * Ações inline na tabela de leads: trocar etapa e excluir sem precisar abrir
 * a ficha da empresa. O select troca a etapa direto no CRM.
 */
export function LeadRowActions({
  leadId,
  stage,
  companyName,
}: {
  leadId: string;
  stage: Stage;
  companyName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localStage, setLocalStage] = useState<Stage>(stage);

  async function mudarEtapa(novo: Stage) {
    const anterior = localStage;
    setLocalStage(novo);
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage: novo }),
      });
      if (!res.ok) setLocalStage(anterior);
      else router.refresh();
    } catch {
      setLocalStage(anterior);
    } finally {
      setBusy(false);
    }
  }

  async function excluir() {
    if (!confirm(`Remover "${companyName}" dos seus leads?\n\nA empresa continua na base de busca — você só perde as anotações e a etapa do CRM.`)) {
      return;
    }
    setBusy(true);
    await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label={`Etapa de ${companyName}`}
        className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        value={localStage}
        disabled={busy}
        onChange={(e) => mudarEtapa(e.target.value as Stage)}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>{STAGE_LABEL[s]}</option>
        ))}
      </select>

      <button
        onClick={excluir}
        disabled={busy}
        title="Excluir lead"
        className="rounded-lg border border-ink-200 p-1.5 text-ink-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </button>
    </div>
  );
}
