import Link from "next/link";
import { Lock } from "lucide-react";
import type { PlanId } from "@/lib/types";
import { PLANOS } from "@/lib/limites";

/**
 * Mostra o recurso que o plano não cobre, borrado, em vez de escondê-lo.
 *
 * Esconder é o instinto — parece mais limpo. Mas o cliente nunca descobre que
 * o recurso existe, e então nunca tem motivo para pagar. Borrado, cada tela
 * vira um convite: ele vê a forma do que está perdendo.
 *
 * O conteúdo borrado é uma AMOSTRA GENÉRICA, nunca dado real de outra conta
 * nem número inventado apresentado como dele.
 */
export function Bloqueado({
  titulo,
  descricao,
  planoNecessario,
  children,
}: {
  titulo: string;
  descricao: string;
  planoNecessario: PlanId;
  /** A amostra que aparece desfocada atrás do aviso. */
  children: React.ReactNode;
}) {
  const p = PLANOS[planoNecessario];

  return (
    // A altura mínima é o que impede o aviso de vazar: a amostra borrada pode
    // ter três linhas e o texto sobreposto, cinco. Sem piso, o cadeado e o
    // botão escapam do cartão.
    <div className="relative min-h-[210px] overflow-hidden">
      {/* aria-hidden: quem usa leitor de tela não deve tropeçar num conteúdo
          decorativo que ele nem pode acessar. */}
      <div className="pointer-events-none select-none blur-[6px] saturate-50" aria-hidden="true">
        {children}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 px-5 text-center backdrop-blur-[2px]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900">
          <Lock size={16} className="text-white" />
        </span>
        <p className="text-sm font-semibold text-ink-900">{titulo}</p>
        <p className="max-w-[280px] text-xs leading-relaxed text-ink-600">{descricao}</p>
        <Link href="/app/planos" className="btn-brand mt-1 px-3 py-1.5 text-sm">
          Ver o plano {p.nome}
        </Link>
      </div>
    </div>
  );
}

/** Lista de barras usada tanto pelo dado real quanto pela amostra borrada. */
export function ListaFatias({
  fatias,
  cor = "#5b3df5",
  vazio = "Sem dados no período.",
}: {
  fatias: { rotulo: string; n: number; pct: number }[];
  cor?: string;
  vazio?: string;
}) {
  if (fatias.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-400">{vazio}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {fatias.map((f) => (
        <li key={f.rotulo}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{f.rotulo}</span>
            <span className="shrink-0 font-semibold">
              {f.n}
              <span className="ml-1.5 font-normal text-ink-400">{f.pct}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(f.pct, 2)}%`, background: cor }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Amostra neutra para o estado bloqueado — números redondos e óbvios. */
export const AMOSTRA_ORIGENS = [
  { rotulo: "Instagram", n: 120, pct: 48 },
  { rotulo: "Acesso direto", n: 80, pct: 32 },
  { rotulo: "google.com", n: 30, pct: 12 },
  { rotulo: "facebook.com", n: 20, pct: 8 },
];

export const AMOSTRA_DISPOSITIVOS = [
  { rotulo: "Celular", n: 210, pct: 84 },
  { rotulo: "Computador", n: 30, pct: 12 },
  { rotulo: "Tablet", n: 10, pct: 4 },
];

export const AMOSTRA_PAISES = [
  { rotulo: "BR", n: 230, pct: 92 },
  { rotulo: "PT", n: 15, pct: 6 },
  { rotulo: "US", n: 5, pct: 2 },
];
