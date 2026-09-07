import { Check, Minus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ORDEM_PLANOS, PLANOS, precoFormatado } from "@/lib/limites";

export const dynamic = "force-dynamic";

export default async function Planos() {
  const user = await requireUser();

  const linhas = [
    { label: "Páginas", valor: (id: string) => String(PLANOS[id as keyof typeof PLANOS].maxPaginas) },
    {
      label: "Links",
      valor: (id: string) => {
        const m = PLANOS[id as keyof typeof PLANOS].maxLinks;
        return m === null ? "Ilimitados" : String(m);
      },
    },
    { label: "QR Code", valor: () => true },
    { label: "Analytics", valor: (id: string) => `${PLANOS[id as keyof typeof PLANOS].analyticsDias} dias` },
    { label: "Escolher tema", valor: (id: string) => PLANOS[id as keyof typeof PLANOS].temas },
    { label: "Formulário e leads", valor: (id: string) => PLANOS[id as keyof typeof PLANOS].formularios },
    {
      label: "Personalização avançada",
      valor: (id: string) => PLANOS[id as keyof typeof PLANOS].personalizacaoAvancada,
    },
    { label: "Sem marca LINKFIVE", valor: (id: string) => !PLANOS[id as keyof typeof PLANOS].marca },
    { label: "Equipe", valor: (id: string) => PLANOS[id as keyof typeof PLANOS].equipe },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Planos</h1>
      <p className="mt-1 text-sm text-ink-500">
        Seu plano atual é o <strong>{PLANOS[user.plan].nome}</strong>.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ORDEM_PLANOS.map((id) => {
          const p = PLANOS[id];
          const atual = user.plan === id;
          return (
            <div
              key={id}
              className={`card relative flex flex-col p-5 ${
                p.destaque ? "border-brand-500 ring-2 ring-brand-100" : ""
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  {p.destaque}
                </span>
              )}

              <p className="font-semibold">{p.nome}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight">
                {precoFormatado(p)}
                {p.precoCents > 0 && (
                  <span className="text-sm font-medium text-ink-400">/mês</span>
                )}
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-600">
                {linhas.map((l) => {
                  const v = l.valor(id);
                  if (v === false) return null;
                  return (
                    <li key={l.label} className="flex items-start gap-2">
                      <Check size={15} className="mt-0.5 shrink-0 text-ok-500" />
                      <span>
                        {l.label}
                        {typeof v === "string" ? `: ${v}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <button
                className={`mt-5 ${atual ? "btn-ghost" : "btn-brand"}`}
                disabled
                title="A cobrança ainda não está ativa"
              >
                {atual ? "Plano atual" : "Em breve"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-5 flex items-center gap-2 text-sm text-ink-500">
        <Minus size={14} />
        A cobrança ainda não está ativa. A estrutura de assinatura já existe no sistema, faltando só
        ligar o meio de pagamento.
      </p>
    </div>
  );
}
