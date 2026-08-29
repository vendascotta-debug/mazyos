import clsx from "clsx";
import type { Confidence, ScoreTier, Stage } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";

export const TIER_STYLE: Record<ScoreTier, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-sky-50 text-sky-700 border-sky-200",
  C: "bg-amber-50 text-amber-700 border-amber-200",
  D: "bg-ink-100 text-ink-500 border-ink-200",
};

export const TIER_DOT: Record<ScoreTier, string> = {
  A: "#059669",
  B: "#0284c7",
  C: "#d97706",
  D: "#94a3b8",
};

export function ScoreBadge({ score, tier, size = "md" }: { score: number; tier: ScoreTier; size?: "sm" | "md" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border font-semibold tabular-nums",
        TIER_STYLE[tier],
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
      )}
      title={`Lead Score ${score}/100 — classe ${tier}`}
    >
      <span className={size === "sm" ? "text-[11px]" : "text-sm"}>{score}</span>
      <span className="opacity-60">·</span>
      <span>{tier}</span>
    </span>
  );
}

export const STAGE_STYLE: Record<Stage, string> = {
  novo: "bg-ink-100 text-ink-600 border-ink-200",
  contatado: "bg-blue-50 text-blue-700 border-blue-200",
  interessado: "bg-violet-50 text-violet-700 border-violet-200",
  cotacao: "bg-amber-50 text-amber-700 border-amber-200",
  negociacao: "bg-orange-50 text-orange-700 border-orange-200",
  cliente: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={clsx("chip", STAGE_STYLE[stage])}>{STAGE_LABEL[stage]}</span>;
}

const CONF_STYLE: Record<Confidence, string> = {
  alta: "bg-emerald-50 text-emerald-700 border-emerald-200",
  media: "bg-amber-50 text-amber-700 border-amber-200",
  baixa: "bg-ink-100 text-ink-500 border-ink-200",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const label = { alta: "confiança alta", media: "confiança média", baixa: "a confirmar" }[confidence];
  return <span className={clsx("chip", CONF_STYLE[confidence])}>{label}</span>;
}

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className={clsx("mt-1.5 text-2xl font-semibold tabular-nums", accent ? "text-brand-600" : "text-ink-900")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 bg-white px-7 py-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="font-medium text-ink-800">{title}</p>
      <p className="max-w-md text-sm text-ink-500">{description}</p>
      {action}
    </div>
  );
}

export const brl = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
