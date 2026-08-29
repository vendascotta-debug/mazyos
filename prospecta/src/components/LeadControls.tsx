"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/types";

/** Controles do lead salvo: etapa do CRM, potencial e anotação. */
export function LeadControls({
  leadId,
  stage,
  note,
  estimatedValue,
  onDeleted,
}: {
  leadId: string;
  stage: Stage;
  note: string | null;
  estimatedValue: number | null;
  onDeleted?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [localStage, setLocalStage] = useState<Stage>(stage);
  const [localNote, setLocalNote] = useState(note ?? "");
  const [dirty, setDirty] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Remover este lead do CRM? A empresa continua na base de busca.")) return;
    setSaving(true);
    await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    if (onDeleted) router.push(onDeleted);
    router.refresh();
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor={`stage-${leadId}`}>Etapa no CRM</label>
        <select
          id={`stage-${leadId}`}
          className="input"
          value={localStage}
          onChange={(e) => {
            const s = e.target.value as Stage;
            setLocalStage(s);
            patch({ stage: s });
          }}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor={`valor-${leadId}`}>Potencial mensal (R$)</label>
        <input
          id={`valor-${leadId}`}
          type="number"
          min={0}
          step={100}
          className="input"
          defaultValue={estimatedValue ?? ""}
          onBlur={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            if (v !== estimatedValue) patch({ estimatedValue: v });
          }}
        />
      </div>

      <div>
        <label className="label" htmlFor={`nota-${leadId}`}>Anotação</label>
        <textarea
          id={`nota-${leadId}`}
          className="input min-h-24 resize-y"
          placeholder="Falei com o gerente, pediu para retornar quinta…"
          value={localNote}
          onChange={(e) => { setLocalNote(e.target.value); setDirty(true); }}
        />
        {dirty && (
          <button
            className="btn-primary mt-2 w-full"
            disabled={saving}
            onClick={async () => { await patch({ note: localNote }); setDirty(false); }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Salvar anotação
          </button>
        )}
      </div>

      <button className="btn-ghost w-full !text-red-600 hover:!bg-red-50" disabled={saving} onClick={remove}>
        <Trash2 size={14} /> Remover lead
      </button>
    </div>
  );
}
