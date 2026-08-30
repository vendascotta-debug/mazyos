import Link from "next/link";
import { LayoutList, Map as MapIcon, Download } from "lucide-react";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { parseFilters, toQuery, type RawParams } from "@/lib/filters";
import { listCities, listLists, listNeighborhoods, searchCompanies } from "@/lib/repo";
import { SEGMENTS, getSegment } from "@/lib/segments";
import { CompanyCard } from "@/components/CompanyCard";
import { FiltersPanel } from "@/components/FiltersPanel";
import { MapPanel } from "@/components/MapPanel";
import { FiltrosAtivos } from "@/components/FiltrosAtivos";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BuscarPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const segment = getSegment(filters.segment);
  const view = (Array.isArray(params.view) ? params.view[0] : params.view) ?? "lista";

  const outcome = await searchCompanies(filters, user.id);
  const cities = await listCities(filters.segment);
  const neighborhoods = await listNeighborhoods(filters.segment, filters.city);
  const lists = (await listLists(user.id, filters.segment)).map((l) => ({ id: l.id, name: l.name }));

  const totalPages = Math.max(1, Math.ceil(outcome.total / filters.pageSize));
  const pageLink = (p: number) => `/buscar?${toQuery({ ...filters, page: p })}${view !== "lista" ? `&view=${view}` : ""}`;
  const viewLink = (v: string) => `/buscar?${toQuery(filters)}${v !== "lista" ? `&view=${v}` : ""}`;

  const recorte = [filters.neighborhood, filters.city].filter(Boolean).join(", ") || "todas as praças";

  return (
    // No celular o botão de filtros fica ACIMA do conteúdo; no desktop, o painel
    // fica ao lado. Sem o flex-col, o botão entrava na mesma linha e espremia a
    // lista numa coluna estreita.
    <div className="flex flex-col lg:flex-row">
      <FiltersPanel
        filters={filters}
        segments={SEGMENTS.map((s) => ({ slug: s.slug, name: s.name, emoji: s.emoji, tagline: s.tagline }))}
        subsegments={outcome.facets.subsegments}
        cities={cities}
        neighborhoods={neighborhoods}
        total={outcome.total}
      />

      <div className="min-w-0 flex-1">
        <PageHeader
          title={filters.allSegments ? "🔎 Toda a base" : `${segment.emoji} ${segment.name}`}
          subtitle={`${outcome.total.toLocaleString("pt-BR")} ${filters.allSegments ? "empresas em todos os segmentos" : segment.labels.companyPlural + " em " + recorte}${filters.radiusKm ? ` · raio de ${filters.radiusKm} km` : ""}`}
        >
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-ink-200">
              {[
                { v: "lista", label: "Lista", icon: LayoutList },
                { v: "mapa", label: "Mapa", icon: MapIcon },
              ].map(({ v, label, icon: Icon }) => (
                <Link
                  key={v}
                  href={viewLink(v)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 text-sm",
                    view === v ? "bg-ink-900 text-white" : "bg-white text-ink-600 hover:bg-ink-50",
                  )}
                >
                  <Icon size={15} /> {label}
                </Link>
              ))}
            </div>
            <a className="btn-ghost" href={`/api/export?segment=${filters.segment}`}>
              <Download size={15} /> Exportar leads
            </a>
          </div>
        </PageHeader>

        <div className="p-4 sm:p-6">
          <FiltrosAtivos filters={filters} />
          {outcome.total === 0 ? (
            filters.query && outcome.emOutrosSegmentos === 0 ? (
              // O nome não existe em lugar nenhum da base. Como a carga ainda é
              // parcial, dizer isso evita a conclusão de que o sistema falhou.
              <EmptyState
                title={`"${filters.query}" não está na base`}
                description="A base ainda não cobre todas as empresas de São Paulo — essa pode ser uma das que faltam. Procurar por uma palavra só (o nome principal, sem 'bar do', 'restaurante') costuma achar mais."
                action={
                  <Link href={`/buscar?segment=${filters.segment}`} className="btn-ghost mt-2">
                    Limpar busca
                  </Link>
                }
              />
            ) : outcome.emOutrosSegmentos ? (
              // O nome existe, só está fora do recorte. Dizer isso evita a
              // conclusão errada de que a empresa não está na base.
              <EmptyState
                title={`"${filters.query}" não aparece neste recorte`}
                description={`Mas existe${outcome.emOutrosSegmentos > 1 ? "m" : ""} ${outcome.emOutrosSegmentos.toLocaleString("pt-BR")} empresa${outcome.emOutrosSegmentos > 1 ? "s" : ""} com esse nome em outros segmentos ou subsegmentos da base.`}
                action={
                  <Link
                    href={`/buscar?segment=${filters.segment}&q=${encodeURIComponent(filters.query ?? "")}&tudo=1`}
                    className="btn-brand mt-2"
                  >
                    Buscar em toda a base
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title="Nenhuma empresa nesse recorte"
                description="Tente ampliar o raio, limpar o filtro de bairro ou baixar o Lead Score mínimo."
                action={
                  <Link href={`/buscar?segment=${filters.segment}`} className="btn-ghost mt-2">
                    Limpar filtros
                  </Link>
                }
              />
            )
          ) : view === "mapa" ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
              <div className="h-[55vh] min-h-[320px] lg:h-[calc(100vh-190px)] lg:min-h-[420px]">
                <MapPanel points={outcome.mapPoints} center={outcome.center} radiusKm={filters.radiusKm} />
              </div>
              <div className="space-y-3 lg:h-[calc(100vh-190px)] lg:min-h-[420px] lg:overflow-y-auto lg:pr-1 thin-scroll">
                {outcome.results.map((r) => (
                  <CompanyCard key={r.company.id} result={r} lists={lists} compact />
                ))}
                {totalPages > 1 && <Pagination page={filters.page} totalPages={totalPages} pageLink={pageLink} />}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {outcome.results.map((r) => (
                <CompanyCard key={r.company.id} result={r} lists={lists} />
              ))}
              {totalPages > 1 && <Pagination page={filters.page} totalPages={totalPages} pageLink={pageLink} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  pageLink,
}: {
  page: number;
  totalPages: number;
  pageLink: (p: number) => string;
}) {
  const around = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
      {page > 1 && (
        <Link href={pageLink(page - 1)} className="btn-ghost !px-2.5 !py-1.5 text-xs">
          Anterior
        </Link>
      )}
      {around.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && around[i - 1] !== p - 1 && <span className="text-ink-400">…</span>}
          <Link
            href={pageLink(p)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-medium",
              p === page ? "bg-ink-900 text-white" : "border border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
            )}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={pageLink(page + 1)} className="btn-ghost !px-2.5 !py-1.5 text-xs">
          Próxima
        </Link>
      )}
    </nav>
  );
}
