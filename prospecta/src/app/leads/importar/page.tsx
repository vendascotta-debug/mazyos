import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listLists } from "@/lib/repo";
import { DEFAULT_SEGMENT, SEGMENTS } from "@/lib/segments";
import { PageHeader } from "@/components/ui";
import { ImportarLeads } from "@/components/ImportarLeads";

export const dynamic = "force-dynamic";

export default async function ImportarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const segmento = typeof sp.segment === "string" ? sp.segment : DEFAULT_SEGMENT;

  const listas = (await Promise.all(SEGMENTS.map((s) => listLists(user.id, s.slug)))).flat();
  const segmentos = SEGMENTS.map((s) => ({
    slug: s.slug,
    name: s.name,
    emoji: s.emoji,
    subsegments: s.subsegments.map((x) => ({ slug: x.slug, name: x.name })),
  }));

  return (
    <div>
      <PageHeader
        title="Adicionar leads"
        subtitle="Cadastre uma empresa ou suba uma planilha. Se ela já estiver na base, o Prospecta reconhece e traz o sócio da Receita."
      >
        <Link href={`/leads?segment=${segmento}`} className="btn-ghost">
          <ArrowLeft size={15} /> Meus leads
        </Link>
      </PageHeader>
      <div className="p-4 sm:p-6">
        <ImportarLeads
          segmentos={segmentos}
          segmentoInicial={segmento}
          listas={listas.map((l) => ({ id: l.id, name: l.name, segmentSlug: l.segmentSlug }))}
        />
      </div>
    </div>
  );
}
