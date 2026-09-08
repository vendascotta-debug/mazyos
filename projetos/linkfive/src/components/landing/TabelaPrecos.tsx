"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { PlanId } from "@/lib/types";
import {
  ORDEM_PLANOS,
  PLANOS,
  descontoAnual,
  mensalNoAnual,
  precoFormatado,
} from "@/lib/limites";

/**
 * Tabela de preços com seletor Mensal/Anual.
 *
 * Usada na landing e na tela de planos do painel — uma tabela só, porque duas
 * cópias divergem no primeiro ajuste de preço e o cliente vê valores
 * diferentes em dois lugares do mesmo produto.
 *
 * O anual vem selecionado por padrão: é a opção que interessa ao negócio
 * (dinheiro adiantado, menos cancelamento) e a mais barata para o cliente.
 * Mostrar primeiro o mais caro faria o produto parecer mais caro do que é.
 */
export function TabelaPrecos({
  checkouts,
  planoAtual,
  cta = "Assinar",
  ctaGratis,
}: {
  /** Links de checkout por plano e ciclo, resolvidos no servidor. */
  checkouts: Record<string, { mensal: string | null; anual: string | null }>;
  /** Quando vem do painel: destaca o plano em uso. */
  planoAtual?: PlanId;
  cta?: string;
  /** Para onde vai o botão do plano gratuito. */
  ctaGratis?: string;
}) {
  const [ciclo, setCiclo] = useState<"mensal" | "anual">("anual");

  return (
    <>
      <div className="mt-6 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1">
          {(["mensal", "anual"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCiclo(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                ciclo === c ? "bg-ink-900 text-white" : "text-ink-600 hover:text-ink-900"
              }`}
            >
              {c === "mensal" ? "Mensal" : "Anual"}
              {c === "anual" && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    ciclo === "anual" ? "bg-accent-500 text-ink-900" : "bg-accent-100 text-warn-500"
                  }`}
                >
                  −{descontoAnual(PLANOS.starter) ?? 0}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {ORDEM_PLANOS.map((id) => {
          const p = PLANOS[id];
          const atual = planoAtual === id;
          const link = checkouts[id]?.[ciclo] ?? null;
          const gratuito = p.precoCents === 0;
          const semAnual = ciclo === "anual" && !p.precoAnualCents && !gratuito;

          return (
            <div
              key={id}
              className={`card relative flex flex-col p-6 ${
                p.destaque ? "border-brand-500 ring-2 ring-brand-100" : ""
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  {p.destaque}
                </span>
              )}

              <p className="font-semibold">{p.nome}</p>

              <p className="mt-2 text-[28px] font-bold leading-none tracking-tight">
                {precoFormatado(p, ciclo)}
                {!gratuito && (
                  <span className="text-sm font-medium text-ink-400">
                    /{ciclo === "anual" ? "ano" : "mês"}
                  </span>
                )}
              </p>

              {/* No anual, o que o cliente compara é o mês. Sem esta linha ele
                  vê "R$ 199,90" e acha caro sem fazer a conta. */}
              <p className="mt-1 h-5 text-sm text-ink-500">
                {!gratuito && ciclo === "anual" && mensalNoAnual(p)
                  ? `equivale a ${mensalNoAnual(p)}/mês`
                  : gratuito
                    ? "para sempre"
                    : ""}
              </p>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-600">
                <Item>
                  {p.maxPaginas === 1 ? "1 página" : `${p.maxPaginas.toLocaleString("pt-BR")} páginas`}
                </Item>
                <Item>
                  {p.maxCurtos === null
                    ? "Links diretos ilimitados"
                    : `${p.maxCurtos.toLocaleString("pt-BR")} links diretos ativos`}
                </Item>
                <Item>
                  {p.maxCurtosMes === null
                    ? "Criação sem limite mensal"
                    : `${p.maxCurtosMes} links novos por mês`}
                </Item>
                <Item>{p.maxMembros === 1 ? "1 pessoa" : `${p.maxMembros} pessoas na conta`}</Item>
                <Item>
                  Métricas por {p.analyticsDias >= 365 ? "1 ano" : `${p.analyticsDias} dias`}
                </Item>
                <Item>QR Code</Item>
                <Item>Código personalizado</Item>
                {p.formularios && <Item>Formulário e captura de leads</Item>}
                {p.temas && <Item>Temas e personalização</Item>}
                {!p.marca && <Item>Sem a marca LINKFIVE</Item>}
                {p.equipe && <Item>Acesso para equipe</Item>}
                <Item>
                  <strong>Nunca exibimos anúncios</strong>
                </Item>
              </ul>

              {atual ? (
                <button className="btn-ghost mt-6" disabled>
                  Plano atual
                </button>
              ) : gratuito ? (
                <a href={ctaGratis ?? "/cadastrar"} className="btn-ghost mt-6">
                  Começar grátis
                </a>
              ) : link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 ${p.destaque ? "btn-brand" : "btn-dark"}`}
                >
                  {cta} {p.nome}
                </a>
              ) : (
                <button
                  className="btn-ghost mt-6"
                  disabled
                  title={semAnual ? "Este plano não tem opção anual" : "Checkout ainda não configurado"}
                >
                  {semAnual ? "Só no mensal" : "Em breve"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check size={15} className="mt-0.5 shrink-0 text-ok-500" />
      <span>{children}</span>
    </li>
  );
}
