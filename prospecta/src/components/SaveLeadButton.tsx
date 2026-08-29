"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Bookmark, BookmarkCheck, ChevronDown, Loader2 } from "lucide-react";

interface Props {
  companyId: string;
  savedLeadId: string | null;
  lists: { id: string; name: string }[];
  size?: "sm" | "md";
}

export function SaveLeadButton({ companyId, savedLeadId, lists, size = "md" }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [savedId, setSavedId] = useState(savedLeadId);

  async function save(listId?: string) {
    setSaving(true);
    setOpen(false);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId, listId: listId ?? null }),
      });
      const data = (await res.json()) as { lead?: { id: string } };
      if (data.lead) setSavedId(data.lead.id);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const cls = size === "sm" ? "!px-2.5 !py-1.5 text-xs" : "";

  if (savedId) {
    return (
      <span className={clsx("btn border border-emerald-200 bg-emerald-50 text-emerald-700", cls)}>
        <BookmarkCheck size={size === "sm" ? 14 : 16} /> Salvo
      </span>
    );
  }

  return (
    <div className="relative flex">
      <button className={clsx("btn-brand rounded-r-none", cls)} onClick={() => save()} disabled={saving}>
        {saving ? <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" /> : <Bookmark size={size === "sm" ? 14 : 16} />}
        Salvar lead
      </button>
      <button
        className={clsx("btn-brand rounded-l-none border-l border-white/25 !px-2", cls)}
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        aria-label="Salvar em uma lista"
      >
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-lg border border-ink-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Salvar direto numa lista
          </p>
          {lists.length === 0 && <p className="px-3 py-2 text-xs text-ink-500">Nenhuma lista criada ainda.</p>}
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => save(l.id)}
              className="block w-full px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
