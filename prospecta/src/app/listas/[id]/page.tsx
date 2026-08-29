import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Linkedin, Phone, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getList, listLeads } from "@/lib/repo";
import { getSegment } from "@/lib/segments";
import { bestDecisionMaker, ROLE_LABEL } from "@/lib/decisores";
import { EmptyState, PageHeader, ScoreBadge, StageBadge, brl } from "@/components/ui";
import { RemoveFromListButton } from "@/components/RemoveFromListButton";

export const dynamic = "force-dynamic";

export default async function ListaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const list = await getList(user.id, id);
  if (!list) notFound();

  const leads = await listLeads(user.id, { listId: id });
  const segment = getSegment(list.segmentSlug);
  const potencial = leads.reduce((a, l) => a + (l.estimatedValue ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={list.name}
        subtitle={`${leads.length} lead(s) · ${segment.emoji} ${segment.name} · potencial somado ${brl(potencial)}${list.description ? ` — ${list.description}` : ""}`}
      >
        <div className="flex items-center gap-2">
          <Link href={`/listas?segment=${list.segmentSlug}`} className="btn-ghost">
            <ArrowLeft size={15} /> Listas
          </Link>
          <a className="btn-ghost" href={`/api/export?listId=${id}`}>
            <Download size={15} /> CSV
          </a>
        </div>
      </PageHeader>

      <div className="p-6">
        {leads.length === 0 ? (
          <EmptyState
            title="Lista vazia"
            description="Na busca, use a setinha ao lado de “Salvar lead” para mandar a empresa direto para esta lista."
            action={
              <Link href={`/buscar?segment=${list.segmentSlug}`} className="btn-brand mt-2">
                <Search size={15} /> Buscar empresas
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {leads.map((l) => {
              const d = bestDecisionMaker(l.decisionMakers);
              return (
                <article key={l.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/empresa/${l.companyId}`} className="font-medium text-ink-900 hover:text-brand-600">
                        {l.company.name}
                      </Link>
                      <ScoreBadge score={l.score} tier={l.tier} size="sm" />
                      <StageBadge stage={l.stage} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-500">
                      <span>{l.company.neighborhood}, {l.company.city}/{l.company.uf}</span>
                      {l.company.whatsapp || l.company.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {l.company.whatsapp ?? l.company.phone}
                        </span>
                      ) : null}
                      {d && (
                        <span className="flex items-center gap-1">
                          {d.name ?? `cargo provável: ${d.role}`}
                          <span className="chip border-ink-200 bg-ink-50 text-ink-500">{ROLE_LABEL[d.roleCategory]}</span>
                          {d.linkedin && (
                            <a href={d.linkedin} target="_blank" rel="noreferrer noopener" className="text-ink-400 hover:text-[#0a66c2]">
                              <Linkedin size={11} />
                            </a>
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-ink-600">{brl(l.estimatedValue)}</span>
                    <RemoveFromListButton listId={id} leadId={l.id} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
