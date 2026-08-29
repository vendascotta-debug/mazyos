"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

export function NewListForm({ segment }: { segment: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, segment }),
      });
      setName("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-brand" onClick={() => setOpen(true)}>
        <Plus size={15} /> Nova lista
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-52 flex-1">
        <label className="label" htmlFor="list-name">Nome da lista</label>
        <input
          id="list-name"
          className="input"
          value={name}
          autoFocus
          placeholder="ex.: Churrascarias zona sul — visita em julho"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="min-w-52 flex-1">
        <label className="label" htmlFor="list-desc">Descrição (opcional)</label>
        <input
          id="list-desc"
          className="input"
          value={description}
          placeholder="critério da lista, meta, prazo…"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button className="btn-brand" disabled={saving || !name.trim()}>
          {saving && <Loader2 size={14} className="animate-spin" />} Criar
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
