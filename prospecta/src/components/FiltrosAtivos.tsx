"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import type { SearchFilters } from "@/lib/types";
import { getSegment } from "@/lib/segments";

// ---------------------------------------------------------------------------
// Barra de filtros ativos.
//
// Filtro que se aplica sem deixar rastro na tela é armadilha: o usuário procura
// "juarez", não acha, e não percebe que havia um subsegmento ligado. Aqui cada
// filtro em vigor aparece com um ✕ para sair dele em um clique.
// ---------------------------------------------------------------------------

interface Ativo {
  rotulo: string;
  limpar: Record<string, string | null>;
}

export function FiltrosAtivos({ filters }: { filters: SearchFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const segmento = getSegment(filters.segment);

  const remover = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    next.delete("pagina");
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const ativos: Ativo[] = [];

  if (filters.query) {
    ativos.push({ rotulo: `nome: "${filters.query}"`, limpar: { q: null } });
  }
  if (filters.allSegments) {
    ativos.push({ rotulo: "buscando em toda a base", limpar: { tudo: null } });
  }
  for (const slug of filters.subsegments) {
    const nome = segmento.subsegments.find((s) => s.slug === slug)?.name ?? slug;
    ativos.push({
      rotulo: nome,
      limpar: { sub: filters.subsegments.filter((s) => s !== slug).join(",") || null },
    });
  }
  if (filters.city) {
    ativos.push({ rotulo: filters.city, limpar: { city: null, bairro: null } });
  }
  if (filters.neighborhood) {
    ativos.push({ rotulo: filters.neighborhood, limpar: { bairro: null } });
  }
  if (filters.radiusKm) {
    ativos.push({ rotulo: `raio ${filters.radiusKm} km`, limpar: { raio: null } });
  }
  if (filters.minScore > 0) {
    ativos.push({ rotulo: `score ≥ ${filters.minScore}`, limpar: { score: null } });
  }
  for (const p of filters.porte) {
    ativos.push({
      rotulo: `porte ${p}`,
      limpar: { porte: filters.porte.filter((x) => x !== p).join(",") || null },
    });
  }
  if (filters.onlyWithDecisionMaker) {
    ativos.push({ rotulo: "com decisor", limpar: { decisor: null } });
  }
  if (filters.onlyWithPhone) {
    ativos.push({ rotulo: "com telefone", limpar: { fone: null } });
  }
  if (filters.hideSaved) {
    ativos.push({ rotulo: "sem os já salvos", limpar: { novos: null } });
  }

  if (!ativos.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5" aria-busy={pending}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Filtros ativos</span>

      {ativos.map((a) => (
        <button
          key={a.rotulo}
          onClick={() => remover(a.limpar)}
          className="chip border-brand-200 bg-brand-50 py-1 text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100"
          title={`Remover: ${a.rotulo}`}
        >
          {a.rotulo}
          <X size={12} className="opacity-70" />
        </button>
      ))}

      {ativos.length > 1 && (
        <button
          onClick={() => start(() => router.push(`${pathname}?segment=${filters.segment}`, { scroll: false }))}
          className="chip border-ink-200 bg-white py-1 text-ink-500 hover:bg-ink-50"
        >
          limpar tudo
        </button>
      )}
    </div>
  );
}
