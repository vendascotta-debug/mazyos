"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { GripVertical, Linkedin, MapPin, Phone } from "lucide-react";
import { STAGES, STAGE_LABEL, type Stage, type ScoreTier } from "@/lib/types";
import { ScoreBadge, brl } from "@/components/ui";

export interface KanbanCard {
  id: string;
  companyId: string;
  company: string;
  city: string;
  neighborhood: string;
  phone: string | null;
  score: number;
  tier: ScoreTier;
  stage: Stage;
  estimatedValue: number | null;
  decisorName: string | null;
  decisorRole: string | null;
  decisorLinkedin: string | null;
}

const COLUMN_ACCENT: Record<Stage, string> = {
  novo: "bg-ink-400",
  contatado: "bg-blue-500",
  interessado: "bg-violet-500",
  cotacao: "bg-amber-500",
  negociacao: "bg-orange-500",
  cliente: "bg-emerald-500",
};

export function KanbanBoard({ cards }: { cards: KanbanCard[] }) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);

  async function move(leadId: string, stage: Stage) {
    const before = items;
    // Otimista: o card muda de coluna na hora, o servidor confirma depois.
    setItems((prev) => prev.map((c) => (c.id === leadId ? { ...c, stage } : c)));
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) setItems(before);
    else router.refresh();
  }

  return (
    <div className="flex gap-4 overflow-x-auto thin-scroll pb-4">
      {STAGES.map((stage) => {
        const column = items.filter((c) => c.stage === stage);
        const total = column.reduce((a, c) => a + (c.estimatedValue ?? 0), 0);

        return (
          <section
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage);
            }}
            onDragLeave={() => setOver((s) => (s === stage ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = dragging ?? e.dataTransfer.getData("text/plain");
              if (id) {
                const card = items.find((c) => c.id === id);
                if (card && card.stage !== stage) move(id, stage);
              }
              setDragging(null);
            }}
            className={clsx(
              "flex w-72 shrink-0 flex-col rounded-xl border bg-ink-100/60 transition-colors",
              over === stage ? "border-brand-400 bg-brand-50" : "border-ink-200",
            )}
          >
            <header className="flex items-center gap-2 border-b border-ink-200 px-3.5 py-3">
              <span className={clsx("h-2 w-2 rounded-full", COLUMN_ACCENT[stage])} />
              <h2 className="text-sm font-semibold text-ink-800">{STAGE_LABEL[stage]}</h2>
              <span className="ml-auto text-xs tabular-nums text-ink-500">{column.length}</span>
            </header>

            <p className="px-3.5 py-2 text-[11px] text-ink-500">{brl(total)} em potencial</p>

            <div className="flex-1 space-y-2 overflow-y-auto thin-scroll px-2.5 pb-3">
              {column.map((c) => (
                <article
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    setDragging(c.id);
                    e.dataTransfer.setData("text/plain", c.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={clsx(
                    "group cursor-grab rounded-lg border border-ink-200 bg-white p-3 shadow-sm active:cursor-grabbing",
                    dragging === c.id && "opacity-50",
                  )}
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical size={14} className="mt-0.5 shrink-0 text-ink-300 group-hover:text-ink-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/empresa/${c.companyId}`}
                          className="text-sm font-medium leading-snug text-ink-900 hover:text-brand-600"
                        >
                          {c.company}
                        </Link>
                        <ScoreBadge score={c.score} tier={c.tier} size="sm" />
                      </div>

                      <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
                        <MapPin size={10} /> {c.neighborhood}, {c.city}
                      </p>

                      {c.decisorName && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-600">
                          <span className="font-medium">{c.decisorName}</span>
                          <span className="text-ink-400">· {c.decisorRole}</span>
                          {c.decisorLinkedin && (
                            <a
                              href={c.decisorLinkedin}
                              target="_blank"
                              rel="noreferrer noopener"
                              onClick={(e) => e.stopPropagation()}
                              className="text-ink-400 hover:text-[#0a66c2]"
                            >
                              <Linkedin size={10} />
                            </a>
                          )}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] tabular-nums text-ink-500">{brl(c.estimatedValue)}</span>
                        {c.phone && (
                          <a
                            href={`tel:${c.phone.replace(/\D/g, "")}`}
                            className="flex items-center gap-1 text-[11px] text-ink-500 hover:text-brand-600"
                          >
                            <Phone size={10} /> {c.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {column.length === 0 && (
                <p className="rounded-lg border border-dashed border-ink-300 px-3 py-6 text-center text-[11px] text-ink-400">
                  arraste um lead para cá
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
