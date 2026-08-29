import Link from "next/link";
import clsx from "clsx";
import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listLeads } from "@/lib/repo";
import { DEFAULT_SEGMENT, SEGMENTS, getSegment } from "@/lib/segments";
import { bestDecisionMaker } from "@/lib/decisores";
import { EmptyState, PageHeader, brl } from "@/components/ui";
import { KanbanBoard, type KanbanCard } from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const segmentSlug = (typeof sp.segment === "string" ? sp.segment : null) ?? DEFAULT_SEGMENT;
  const segment = getSegment(segmentSlug);
  const leads = await listLeads(user.id, { segment: segmentSlug });

  const cards: KanbanCard[] = leads.map((l) => {
    const d = bestDecisionMaker(l.decisionMakers);
    return {
      id: l.id,
      companyId: l.companyId,
      company: l.company.name,
      city: l.company.city,
      neighborhood: l.company.neighborhood,
      phone: l.company.whatsapp ?? l.company.phone,
      score: l.score,
      tier: l.tier,
      stage: l.stage,
      estimatedValue: l.estimatedValue,
      decisorName: d?.name ?? null,
      decisorRole: d?.role ?? null,
      decisorLinkedin: d?.linkedin ?? null,
    };
  });

  const pipeline = leads.filter((l) => l.stage !== "cliente").reduce((a, l) => a + (l.estimatedValue ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="CRM de prospecção"
        subtitle={`${leads.length} lead(s) · ${brl(pipeline)} em pipeline aberto · arraste os cards entre as etapas`}
      >
        <div className="flex overflow-hidden rounded-lg border border-ink-200">
          {SEGMENTS.map((s) => (
            <Link
              key={s.slug}
              href={`/crm?segment=${s.slug}`}
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

      <div className="p-6">
        {cards.length === 0 ? (
          <EmptyState
            title={`Nenhum lead de ${segment.name} no CRM`}
            description="Salve empresas na busca para começar a trabalhar o funil: Novo → Contatado → Interessado → Cotação → Negociação → Cliente."
            action={
              <Link href={`/buscar?segment=${segmentSlug}`} className="btn-brand mt-2">
                <Search size={15} /> Buscar empresas
              </Link>
            }
          />
        ) : (
          <KanbanBoard cards={cards} />
        )}
      </div>
    </div>
  );
}
