"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import clsx from "clsx";
import { Loader2, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { SearchFilters } from "@/lib/types";

interface Props {
  filters: SearchFilters;
  segments: { slug: string; name: string; emoji: string; tagline: string }[];
  subsegments: { slug: string; name: string; count: number }[];
  cities: { city: string; uf: string; count: number }[];
  neighborhoods: { neighborhood: string; count: number }[];
  total: number;
}

const PORTES: { value: string; label: string }[] = [
  { value: "MEI", label: "MEI" },
  { value: "ME", label: "ME" },
  { value: "EPP", label: "EPP" },
  { value: "DEMAIS", label: "Médio/Grande" },
];

export function FiltersPanel({ filters, segments, subsegments, cities, neighborhoods, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  // No celular o painel vira gaveta: 288px fixos ao lado do conteudo nao cabem.
  const [aberto, setAberto] = useState(false);

  /** Toda mudança de filtro é uma navegação — a URL é o estado da busca. */
  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("pagina");
      setAberto(false);
      start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  const toggleInList = (key: string, value: string) => {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setParam({ [key]: next.join(",") || null });
  };

  const activeSub = filters.subsegments;

  // Contador no botão do celular: com o painel fechado, é o único jeito de
  // saber que a lista está filtrada.
  const ativos =
    activeSub.length +
    filters.porte.length +
    (filters.city ? 1 : 0) +
    (filters.neighborhood ? 1 : 0) +
    (filters.radiusKm ? 1 : 0) +
    (filters.query ? 1 : 0) +
    (filters.minScore > 0 ? 1 : 0) +
    (filters.onlyWithDecisionMaker ? 1 : 0) +
    (filters.onlyWithPhone ? 1 : 0) +
    (filters.hideSaved ? 1 : 0);

  return (
    <>
      {/* Celular: botão que abre os filtros, com contador do que está ativo. */}
      <button
        onClick={() => setAberto(true)}
        className="sticky top-14 z-20 flex w-full items-center justify-center gap-2 border-b border-ink-200 bg-white py-3 text-sm font-medium text-ink-700 lg:hidden"
      >
        <SlidersHorizontal size={16} />
        Filtros
        {ativos > 0 && (
          <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            {ativos}
          </span>
        )}
        <span className="text-ink-400">· {total.toLocaleString("pt-BR")} empresas</span>
      </button>

      {/* Fundo escuro que fecha a gaveta ao toque. */}
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden"
          onClick={() => setAberto(false)}
          aria-hidden
        />
      )}

      <aside
        className={clsx(
          "border-ink-200 bg-white",
          // Desktop: coluna fixa. Celular: gaveta que entra pela esquerda.
          "lg:w-72 lg:shrink-0 lg:border-r lg:static lg:translate-x-0",
          "fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm border-r transition-transform duration-200 lg:z-auto",
          aberto ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3 lg:hidden">
          <span className="font-semibold text-ink-900">Filtros</span>
          <button onClick={() => setAberto(false)} aria-label="Fechar filtros" className="p-1 text-ink-500">
            <X size={20} />
          </button>
        </div>

      <div className="sticky top-0 max-h-screen overflow-y-auto thin-scroll p-5 pb-24 space-y-6 lg:pb-5">
        {/* Segmento — a chave da arquitetura multi-mercado */}
        <div>
          <span className="label">Segmento</span>
          <div className="space-y-1.5">
            {segments.map((s) => (
              <button
                key={s.slug}
                onClick={() => start(() => router.push(`${pathname}?segment=${s.slug}`, { scroll: false }))}
                className={clsx(
                  "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                  filters.segment === s.slug
                    ? "border-brand-500 bg-brand-50"
                    : "border-ink-200 hover:border-ink-300 hover:bg-ink-50",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-ink-900">
                  <span>{s.emoji}</span>
                  {s.name}
                </span>
                <span className="mt-0.5 block text-[11px] leading-tight text-ink-500">{s.tagline}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="q">Buscar por nome ou CNPJ</label>
          <input
            id="q"
            className="input"
            defaultValue={filters.query ?? ""}
            placeholder="ex.: churrascaria, 12.345.678"
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam({ q: (e.target as HTMLInputElement).value || null });
            }}
            onBlur={(e) => {
              if ((e.target.value || null) !== filters.query) setParam({ q: e.target.value || null });
            }}
          />
        </div>

        <div>
          <span className="label">Subsegmento</span>
          <div className="flex flex-wrap gap-1.5">
            {subsegments.map((s) => (
              <button
                key={s.slug}
                onClick={() => toggleInList("sub", s.slug)}
                className={clsx(
                  "chip transition-colors",
                  activeSub.includes(s.slug)
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-ink-200 bg-white text-ink-600 hover:border-ink-300",
                )}
              >
                {s.name}
                <span className="opacity-60">{s.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="label" htmlFor="city">Cidade</label>
            <select
              id="city"
              className="input"
              value={filters.city ?? ""}
              onChange={(e) => setParam({ city: e.target.value || null, bairro: null })}
            >
              <option value="">Todas as cidades</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}/{c.uf} ({c.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="bairro">Bairro</label>
            <select
              id="bairro"
              className="input disabled:bg-ink-50 disabled:text-ink-400"
              value={filters.neighborhood ?? ""}
              disabled={!filters.city}
              onChange={(e) => setParam({ bairro: e.target.value || null })}
            >
              <option value="">{filters.city ? "Todos os bairros" : "Escolha a cidade"}</option>
              {neighborhoods.map((n) => (
                <option key={n.neighborhood} value={n.neighborhood}>
                  {n.neighborhood} ({n.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="raio">
            Raio {filters.radiusKm ? `— ${filters.radiusKm} km` : "— sem limite"}
          </label>
          <input
            id="raio"
            type="range"
            min={0}
            max={30}
            step={1}
            defaultValue={filters.radiusKm ?? 0}
            className="w-full accent-brand-500"
            onMouseUp={(e) => setParam({ raio: (e.target as HTMLInputElement).value === "0" ? null : (e.target as HTMLInputElement).value })}
            onTouchEnd={(e) => setParam({ raio: (e.target as HTMLInputElement).value === "0" ? null : (e.target as HTMLInputElement).value })}
          />
          <p className="mt-1 text-[11px] text-ink-500">
            A partir do centro do recorte atual {filters.city ? `(${filters.neighborhood ?? filters.city})` : "(base inteira)"}.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="score">Lead Score mínimo — {filters.minScore}</label>
          <input
            id="score"
            type="range"
            min={0}
            max={90}
            step={5}
            defaultValue={filters.minScore}
            className="w-full accent-brand-500"
            onMouseUp={(e) => setParam({ score: (e.target as HTMLInputElement).value === "0" ? null : (e.target as HTMLInputElement).value })}
            onTouchEnd={(e) => setParam({ score: (e.target as HTMLInputElement).value === "0" ? null : (e.target as HTMLInputElement).value })}
          />
        </div>

        <div>
          <span className="label">Porte</span>
          <div className="flex flex-wrap gap-1.5">
            {PORTES.map((p) => (
              <button
                key={p.value}
                onClick={() => toggleInList("porte", p.value)}
                className={clsx(
                  "chip transition-colors",
                  filters.porte.includes(p.value as never)
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-200 bg-white text-ink-600 hover:border-ink-300",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {[
            { key: "decisor", label: "Só com decisor identificado", checked: filters.onlyWithDecisionMaker },
            { key: "fone", label: "Só com telefone ou WhatsApp", checked: filters.onlyWithPhone },
            { key: "novos", label: "Esconder leads já salvos", checked: filters.hideSaved },
          ].map((t) => (
            <label key={t.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-300 accent-brand-500"
                checked={t.checked}
                onChange={(e) => setParam({ [t.key]: e.target.checked ? "1" : null })}
              />
              {t.label}
            </label>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="ordem">Ordenar por</label>
          <select
            id="ordem"
            className="input"
            value={filters.sort}
            onChange={(e) => setParam({ ordem: e.target.value === "score" ? null : e.target.value })}
          >
            <option value="score">Maior Lead Score</option>
            <option value="distance">Mais perto do centro</option>
            <option value="reviews">Mais avaliações</option>
            <option value="recent">Abertura mais recente</option>
            <option value="name">Nome (A-Z)</option>
          </select>
        </div>

        <div className="flex items-center justify-between border-t border-ink-200 pt-4">
          <span className="text-xs text-ink-500">
            {pending ? (
              <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> buscando…</span>
            ) : (
              <>{total.toLocaleString("pt-BR")} resultado{total === 1 ? "" : "s"}</>
            )}
          </span>
          <button
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
            onClick={() => start(() => router.push(`${pathname}?segment=${filters.segment}`, { scroll: false }))}
          >
            <RotateCcw size={13} /> Limpar
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
