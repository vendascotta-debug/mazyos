import { Check, Minus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ORDEM_PLANOS, PLANOS, precoFormatado } from "@/lib/limites";
import { checkoutDoPlano, cobrancaConfigurada } from "@/lib/cobranca";
import type { PlanId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Planos() {
  const user = await requireUser();
  const temCobranca = cobrancaConfigurada();

  // O link de checkout sai do servidor: assim a URL do Lastlink fica em
  // variável de ambiente e não precisa de deploy pra ser trocada.
  const checkouts: Record<string, string | null> = {};
  for (const id of ORDEM_PLANOS) checkouts[id] = checkoutDoPlano(id);

  const linhas: { label: string; valor: (id: PlanId) => string | boolean }[] = [
    { label: "Páginas", valor: (id) => String(PLANOS[id].maxPaginas) },
    {
      label: "Links diretos (WhatsApp e URL)",
      valor: (id) => {
        const m = PLANOS[id].maxCurtos;
        return m === null ? "Ilimitados" : String(m);
      },
    },
    {
      label: "Links na página",
      valor: (id) => {
        const m = PLANOS[id].maxLinks;
        return m === null ? "Ilimitados" : String(m);
      },
    },
    { label: "QR Code", valor: () => true },
    { label: "Analytics", valor: (id) => `${PLANOS[id].analyticsDias} dias` },
    { label: "Escolher tema", valor: (id) => PLANOS[id].temas },
    { label: "Formulário e leads", valor: (id) => PLANOS[id].formularios },
    { label: "Personalização avançada", valor: (id) => PLANOS[id].personalizacaoAvancada },
    { label: "Sem marca LINKFIVE", valor: (id) => !PLANOS[id].marca },
    { label: "Equipe", valor: (id) => PLANOS[id].equipe },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Planos</h1>
      <p className="mt-1 text-sm text-ink-500">
        Seu plano atual é o <strong>{PLANOS[user.plan].nome}</strong>.
      </p>

      {/* Cortesia não está na grade abaixo — ele não é vendido. Quem tem
          precisa entender o que ganhou, senão vê a grade e acha que está no
          Free. */}
      {PLANOS[user.plan].oculto && (
        <div className="card mt-4 border-brand-200 bg-brand-50 p-4">
          <p className="font-semibold text-brand-700">
            Você está no plano Cortesia — acesso liberado por nós.
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Tudo liberado, sem cobrança: links e links diretos ilimitados, formulários, leads,
            todos os temas, analytics completo e sem a marca LINKFIVE na sua página.
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ORDEM_PLANOS.map((id) => {
          const p = PLANOS[id];
          const atual = user.plan === id;
          const checkout = checkouts[id];

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
                {p.precoCents > 0 && <span className="text-sm font-medium text-ink-400">/mês</span>}
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

              {atual ? (
                <button className="btn-ghost mt-5" disabled>
                  Plano atual
                </button>
              ) : p.precoCents === 0 ? (
                <button className="btn-ghost mt-5" disabled>
                  Plano gratuito
                </button>
              ) : checkout ? (
                <a
                  href={checkout}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-5 ${p.destaque ? "btn-brand" : "btn-dark"}`}
                >
                  Assinar {p.nome}
                </a>
              ) : (
                <button className="btn-ghost mt-5" disabled title="Checkout ainda não configurado">
                  Em breve
                </button>
              )}
            </div>
          );
        })}
      </div>

      {temCobranca ? (
        <div className="card mt-5 p-5">
          <h2 className="font-semibold">Como funciona a assinatura</h2>
          <ol className="mt-3 space-y-2 text-sm text-ink-600">
            <li className="flex gap-2">
              <span className="font-semibold text-brand-600">1.</span>
              Você escolhe o plano e finaliza o pagamento no checkout.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-brand-600">2.</span>
              <span>
                O acesso é liberado automaticamente, <strong>no e-mail usado na compra</strong>.
                Use o mesmo e-mail desta conta ({user.email}) para não precisar de ajuste manual.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-brand-600">3.</span>
              Se algo não liberar em alguns minutos, fale com a gente — resolvemos na mão.
            </li>
          </ol>
        </div>
      ) : (
        <p className="mt-5 flex items-start gap-2 text-sm text-ink-500">
          <Minus size={14} className="mt-0.5 shrink-0" />A cobrança ainda não está ativa. A
          estrutura de assinatura já existe no sistema; falta ligar o checkout.
        </p>
      )}
    </div>
  );
}
