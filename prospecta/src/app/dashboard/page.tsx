import Link from "next/link";
import clsx from "clsx";
import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { dashboardMetrics } from "@/lib/repo";
import { DEFAULT_SEGMENT, SEGMENTS, getSegment } from "@/lib/segments";
import { PageHeader, Stat, brl } from "@/components/ui";
import { STAGE_LABEL } from "@/lib/types";
import { TIER_STYLE } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const segmentSlug = (typeof sp.segment === "string" ? sp.segment : null) ?? DEFAULT_SEGMENT;
  const segment = getSegment(segmentSlug);
  const m = await dashboardMetrics(user.id, segmentSlug);

  const maxStage = Math.max(1, ...m.byStage.map((s) => s.count));
  const maxWeek = Math.max(1, ...m.weekly.map((w) => w.count));
  const maxTier = Math.max(1, ...m.byTier.map((t) => t.count));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Prospecção em ${segment.name} — ${m.totalCompanies.toLocaleString("pt-BR")} ${segment.labels.companyPlural} mapeados na base`}
      >
        <div className="flex overflow-hidden rounded-lg border border-ink-200">
          {SEGMENTS.map((s) => (
            <Link
              key={s.slug}
              href={`/dashboard?segment=${s.slug}`}
              className={clsx(
                "px-3 py-2 text-sm",
                s.slug === segmentSlug ? "bg-ink-900 text-white" : "bg-white text-ink-600 hover:bg-ink-50",
              )}
            >
              {s.emoji} {s.name}
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Leads salvos" value={m.savedLeads} hint={`score médio ${m.avgScore}/100`} />
          <Stat label="Pipeline aberto" value={brl(m.pipelineValue)} hint="potencial mensal fora de 'Cliente'" accent />
          <Stat label="Convertidos" value={`${m.conversionRate}%`} hint={`${brl(m.wonValue)} em clientes`} />
          <Stat
            label="Com decisor identificado"
            value={`${m.decisionMakerRate}%`}
            hint={`${m.withDecisionMaker} lead(s) com nome em fonte pública`}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Funil */}
          <section className="card p-5">
            <h2 className="font-semibold text-ink-900">Funil de prospecção</h2>
            <p className="mb-4 text-xs text-ink-500">
              {m.contactRate}% dos leads salvos já saíram da etapa “Novo”.
            </p>
            <div className="space-y-2.5">
              {m.byStage.map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-ink-600">{STAGE_LABEL[s.stage]}</span>
                  <div className="h-7 flex-1 overflow-hidden rounded-md bg-ink-100">
                    <div
                      className="flex h-full items-center justify-end rounded-md bg-brand-500 px-2 text-[11px] font-medium text-white transition-all"
                      style={{ width: `${Math.max(4, (s.count / maxStage) * 100)}%` }}
                    >
                      {s.count > 0 && s.count}
                    </div>
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs tabular-nums text-ink-500">{brl(s.value)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Qualidade da base */}
          <section className="card p-5">
            <h2 className="font-semibold text-ink-900">Qualidade dos leads</h2>
            <p className="mb-4 text-xs text-ink-500">Distribuição por classe de Lead Score.</p>
            <div className="space-y-2.5">
              {m.byTier.map((t) => (
                <div key={t.tier} className="flex items-center gap-3">
                  <span className={clsx("chip w-8 justify-center", TIER_STYLE[t.tier as "A"])}>{t.tier}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-ink-100">
                    <div
                      className="h-full rounded-md bg-ink-800"
                      style={{ width: `${Math.max(2, (t.count / maxTier) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-ink-500">{t.count}</span>
                </div>
              ))}
            </div>

            <h3 className="mt-6 text-sm font-semibold text-ink-800">Leads salvos por semana</h3>
            <div className="mt-3 flex h-24 items-end gap-1.5">
              {m.weekly.map((w) => (
                <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-brand-300"
                    style={{ height: `${Math.max(3, (w.count / maxWeek) * 100)}%` }}
                    title={`${w.count} lead(s)`}
                  />
                  <span className="text-[9px] text-ink-400">{w.week}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-ink-900">Praças mais trabalhadas</h2>
            {m.topCities.length === 0 ? (
              <p className="text-sm text-ink-500">Ainda sem leads salvos.</p>
            ) : (
              <ul className="space-y-2">
                {m.topCities.map((c) => (
                  <li key={c.city} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700">{c.city}</span>
                    <span className="tabular-nums text-ink-500">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-ink-900">Subsegmentos no funil</h2>
            {m.topSubsegments.length === 0 ? (
              <p className="text-sm text-ink-500">Ainda sem leads salvos.</p>
            ) : (
              <ul className="space-y-2">
                {m.topSubsegments.map((s) => (
                  <li key={s.name} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700">{s.name}</span>
                    <span className="tabular-nums text-ink-500">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-ink-900">Atividade recente</h2>
            {m.recentActivities.length === 0 ? (
              <p className="text-sm text-ink-500">
                Nenhuma movimentação ainda.{" "}
                <Link href={`/buscar?segment=${segmentSlug}`} className="text-brand-600 hover:underline">
                  <Search size={12} className="inline" /> comece pela busca
                </Link>
              </p>
            ) : (
              <ol className="space-y-2.5">
                {m.recentActivities.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium text-ink-800">{a.companyName}</span>
                    <span className="block text-xs text-ink-500">{a.message}</span>
                    <span className="text-[10px] text-ink-400">
                      {new Date(a.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
