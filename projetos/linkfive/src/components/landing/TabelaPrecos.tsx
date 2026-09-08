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
              className={`rounded-full px-5 py-2 text-[14px] font-semibold transition-colors ${
                ciclo === c ? "bg-ink-900 text-white" : "text-ink-600 hover:text-ink-900"
              }`}
            >
              {c === "mensal" ? "Mensal" : "Anual"}
              {c === "anual" && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
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

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {ORDEM_PLANOS.map((id) => {
          const p = PLANOS[id];
          const atual = planoAtual === id;
          const link = checkouts[id]?.[ciclo] ?? null;
          const gratuito = p.precoCents === 0;
          const semAnual = ciclo === "anual" && !p.precoAnualCents && !gratuito;

          return (
            <div
              key={id}
              className={`sobe-no-hover relative flex flex-col rounded-[16px] border p-6 ${
                p.destaque
                  ? // O plano que queremos vender fica escuro: num quadro de
                    // três cartões brancos, o escuro é para onde o olho vai.
                    "border-ink-900 bg-ink-900 text-white shadow-xl"
                  : "border-ink-200 bg-white"
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-bold text-ink-900">
                  {p.destaque}
                </span>
              )}

              <p className="text-[17px] font-bold">{p.nome}</p>

              <p className="mt-2.5 text-[34px] font-bold leading-none tracking-tight">
                {precoFormatado(p, ciclo)}
                {!gratuito && (
                  <span className="text-[16px] font-medium text-ink-400">
                    /{ciclo === "anual" ? "ano" : "mês"}
                  </span>
                )}
              </p>

              {/* No anual, o que o cliente compara é o mês. Sem esta linha ele
                  vê "R$ 199,90" e acha caro sem fazer a conta. */}
              <p className={`mt-1.5 h-6 text-[15px] ${p.destaque ? "text-ink-300" : "text-ink-500"}`}>
                {!gratuito && ciclo === "anual" && mensalNoAnual(p)
                  ? `equivale a ${mensalNoAnual(p)}/mês`
                  : gratuito
                    ? "para sempre"
                    : ""}
              </p>

              <ul className={`mt-5 flex-1 space-y-2 text-[14px] ${p.destaque ? "text-ink-200" : "text-ink-600"}`}>
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

              {/* No cartão escuro o botão fantasma some no fundo — ali ele
                  vira contorno claro. */}
              {(() => {
                const fantasma = p.destaque
                  ? "mt-7 inline-flex items-center justify-center rounded-[10px] border border-white/25 px-4 py-3 text-[15px] font-medium text-white disabled:opacity-50"
                  : "btn-ghost mt-7 py-3 text-[15px]";

                if (atual) {
                  return (
                    <button className={fantasma} disabled>
                      Plano atual
                    </button>
                  );
                }
                if (gratuito) {
                  return (
                    <a href={ctaGratis ?? "/cadastrar"} className={fantasma}>
                      Começar grátis
                    </a>
                  );
                }
                if (link) {
                  return (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-7 py-3 text-[15px] ${p.destaque ? "btn-accent" : "btn-dark"}`}
                    >
                      {cta} {p.nome}
                    </a>
                  );
                }
                return (
                  <button
                    className={fantasma}
                    disabled
                    title={
                      semAnual ? "Este plano não tem opção anual" : "Checkout ainda não configurado"
                    }
                  >
                    {semAnual ? "Só no mensal" : "Em breve"}
                  </button>
                );
              })()}
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
      <Check size={16} className="mt-0.5 shrink-0 text-ok-500" />
      <span>{children}</span>
    </li>
  );
}
