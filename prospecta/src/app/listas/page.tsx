import Link from "next/link";
import clsx from "clsx";
import { ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listLists } from "@/lib/repo";
import { DEFAULT_SEGMENT, SEGMENTS, getSegment } from "@/lib/segments";
import { EmptyState, PageHeader } from "@/components/ui";
import { NewListForm } from "@/components/NewListForm";

export const dynamic = "force-dynamic";

export default async function ListasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const segmentSlug = (typeof sp.segment === "string" ? sp.segment : null) ?? DEFAULT_SEGMENT;
  const segment = getSegment(segmentSlug);
  const lists = await listLists(user.id, segmentSlug);

  return (
    <div>
      <PageHeader
        title="Listas de prospecção"
        subtitle={`Recortes de trabalho dentro de ${segment.name} — por região, prioridade ou campanha`}
      >
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-ink-200">
            {SEGMENTS.map((s) => (
              <Link
                key={s.slug}
                href={`/listas?segment=${s.slug}`}
                className={clsx(
                  "px-3 py-2 text-sm",
                  s.slug === segmentSlug ? "bg-ink-900 text-white" : "bg-white text-ink-600 hover:bg-ink-50",
                )}
              >
                {s.emoji} {s.name}
              </Link>
            ))}
          </div>
          <NewListForm segment={segmentSlug} />
        </div>
      </PageHeader>

      <div className="space-y-4 p-4 sm:p-6">
        {lists.length === 0 ? (
          <EmptyState
            title="Nenhuma lista neste segmento"
            description="Listas separam a prospecção por praça, prioridade ou campanha. Crie a primeira e vá salvando leads direto nela pela busca."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lists.map((l) => (
              <Link key={l.id} href={`/listas/${l.id}`} className="card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-ink-900">{l.name}</h2>
                  <span className="chip border-brand-200 bg-brand-50 text-brand-700">
                    <ListChecks size={12} /> {l.leadCount}
                  </span>
                </div>
                {l.description && <p className="mt-1.5 text-sm text-ink-500">{l.description}</p>}
                <p className="mt-3 text-xs text-ink-400">
                  criada em {new Date(l.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
