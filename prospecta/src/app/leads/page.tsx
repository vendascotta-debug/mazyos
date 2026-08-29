import Link from "next/link";
import { Download, Linkedin, Phone, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listLeads, listLists } from "@/lib/repo";
import { getSegment, SEGMENTS } from "@/lib/segments";
import { bestDecisionMaker, ROLE_LABEL } from "@/lib/decisores";
import { EmptyState, PageHeader, ScoreBadge, StageBadge, brl } from "@/components/ui";
import { LeadRowActions } from "@/components/LeadRowActions";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/types";
import { DEFAULT_SEGMENT } from "@/lib/segments";
import clsx from "clsx";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const segmentSlug = (typeof sp.segment === "string" ? sp.segment : null) ?? DEFAULT_SEGMENT;
  const stage = (typeof sp.etapa === "string" ? (sp.etapa as Stage) : null) ?? null;
  const segment = getSegment(segmentSlug);

  const leads = await listLeads(user.id, { segment: segmentSlug, stage });
  const total = (await listLeads(user.id, { segment: segmentSlug })).length;
  const lists = await listLists(user.id, segmentSlug);

  return (
    <div>
      <PageHeader
        title="Meus leads"
        subtitle={`${leads.length} de ${total} leads salvos em ${segment.name}`}
      >
        <div className="flex items-center gap-2">
          {SEGMENTS.length > 1 && (
            <div className="flex overflow-hidden rounded-lg border border-ink-200">
              {SEGMENTS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/leads?segment=${s.slug}`}
                  className={clsx(
                    "px-3 py-2 text-sm",
                    s.slug === segmentSlug ? "bg-ink-900 text-white" : "bg-white text-ink-600 hover:bg-ink-50",
                  )}
                >
                  {s.emoji} {s.name}
                </Link>
              ))}
            </div>
          )}
          <a className="btn-ghost" href={`/api/export?segment=${segmentSlug}${stage ? `&stage=${stage}` : ""}`}>
            <Download size={15} /> CSV
          </a>
        </div>
      </PageHeader>

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/leads?segment=${segmentSlug}`}
            className={clsx("chip", !stage ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600")}
          >
            Todas as etapas
          </Link>
          {STAGES.map((s) => (
            <Link
              key={s}
              href={`/leads?segment=${segmentSlug}&etapa=${s}`}
              className={clsx("chip", stage === s ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600")}
            >
              {STAGE_LABEL[s]}
            </Link>
          ))}
        </div>

        {leads.length === 0 ? (
          <EmptyState
            title="Nenhum lead salvo ainda"
            description="Use a busca para encontrar empresas do segmento e salve as que valem a pena trabalhar."
            action={
              <Link href={`/buscar?segment=${segmentSlug}`} className="btn-brand mt-2">
                <Search size={15} /> Buscar empresas
              </Link>
            }
          />
        ) : (
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-[11px] uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3 font-semibold">Empresa</th>
                  <th className="px-4 py-3 font-semibold">Decisor</th>
                  <th className="px-4 py-3 font-semibold">Local</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Etapa</th>
                  <th className="px-4 py-3 font-semibold">Potencial</th>
                  <th className="px-4 py-3 font-semibold">Listas</th>
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {leads.map((l) => {
                  const d = bestDecisionMaker(l.decisionMakers);
                  return (
                    <tr key={l.id} className="hover:bg-ink-50/60">
                      <td className="px-4 py-3">
                        <Link href={`/empresa/${l.companyId}`} className="font-medium text-ink-900 hover:text-brand-600">
                          {l.company.name}
                        </Link>
                        <span className="block text-xs text-ink-500">{l.company.cnpj}</span>
                      </td>
                      <td className="px-4 py-3">
                        {d ? (
                          <div className="flex items-center gap-1.5">
                            <span className={d.name ? "text-ink-800" : "text-ink-500 italic"}>
                              {d.name ?? d.role}
                            </span>
                            {d.linkedin && (
                              <a href={d.linkedin} target="_blank" rel="noreferrer noopener" className="text-ink-400 hover:text-[#0a66c2]">
                                <Linkedin size={12} />
                              </a>
                            )}
                            <span className="chip border-ink-200 bg-ink-50 text-ink-500">{ROLE_LABEL[d.roleCategory]}</span>
                          </div>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {l.company.neighborhood}, {l.company.city}/{l.company.uf}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={l.score} tier={l.tier} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={l.stage} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-700">{brl(l.estimatedValue)}</td>
                      <td className="px-4 py-3">
                        {l.lists.length ? (
                          <span className="flex flex-wrap gap-1">
                            {l.lists.map((x) => (
                              <Link key={x.id} href={`/listas/${x.id}`} className="chip border-ink-200 bg-ink-50 text-ink-600 hover:bg-ink-100">
                                {x.name}
                              </Link>
                            ))}
                          </span>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <LeadRowActions leadId={l.id} stage={l.stage} companyName={l.company.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Celular: a tabela vira cartões. Rolar 900px de largura com o polegar
            não é trabalho, é castigo. */}
        {leads.length > 0 && (
          <div className="space-y-3 md:hidden">
            {leads.map((l) => {
              const d = bestDecisionMaker(l.decisionMakers);
              return (
                <article key={l.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/empresa/${l.companyId}`} className="font-medium leading-snug text-ink-900">
                      {l.company.name}
                    </Link>
                    <ScoreBadge score={l.score} tier={l.tier} size="sm" />
                  </div>

                  <p className="mt-1 text-xs text-ink-500">
                    {l.company.neighborhood}, {l.company.city}/{l.company.uf}
                  </p>

                  {d && (
                    <p className="mt-2 text-xs text-ink-600">
                      <span className={d.name ? "font-medium text-ink-800" : "italic"}>
                        {d.name ?? d.role}
                      </span>
                      <span className="text-ink-400"> · {ROLE_LABEL[d.roleCategory]}</span>
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {l.company.whatsapp || l.company.phone ? (
                      <a
                        href={`tel:${(l.company.whatsapp ?? l.company.phone ?? "").replace(/\D/g, "")}`}
                        className="chip border-emerald-200 bg-emerald-50 py-1.5 text-emerald-700"
                      >
                        <Phone size={12} /> Ligar
                      </a>
                    ) : null}
                    <span className="chip border-ink-200 bg-ink-50 text-ink-600">{brl(l.estimatedValue)}</span>
                  </div>

                  <div className="mt-3 border-t border-ink-100 pt-3">
                    <LeadRowActions leadId={l.id} stage={l.stage} companyName={l.company.name} />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {lists.length > 0 && (
          <p className="text-xs text-ink-500">
            {lists.length} lista(s) de prospecção neste segmento —{" "}
            <Link href={`/listas?segment=${segmentSlug}`} className="text-brand-600 hover:underline">
              gerenciar listas
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
