import { Minus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ORDEM_PLANOS, PLANOS } from "@/lib/limites";
import { checkoutDoPlano, cobrancaConfigurada } from "@/lib/cobranca";
import { TabelaPrecos } from "@/components/landing/TabelaPrecos";

export const dynamic = "force-dynamic";

export default async function Planos() {
  const user = await requireUser();
  const temCobranca = cobrancaConfigurada();

  // Os links saem do servidor: assim as URLs do Lastlink ficam em variável de
  // ambiente e podem ser trocadas sem deploy.
  const checkouts: Record<string, { mensal: string | null; anual: string | null }> = {};
  for (const id of ORDEM_PLANOS) {
    checkouts[id] = { mensal: checkoutDoPlano(id, "mensal"), anual: checkoutDoPlano(id, "anual") };
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Planos</h1>
      <p className="mt-1 text-sm text-ink-500">
        Seu plano atual é o <strong>{PLANOS[user.plan].nome}</strong>.
      </p>

      {/* Cortesia não está na grade abaixo — ele não é vendido. Quem tem
          precisa entender o que ganhou, senão vê a grade e acha que está no
          plano gratuito. */}
      {PLANOS[user.plan].oculto && (
        <div className="card mt-4 border-brand-200 bg-brand-50 p-4">
          <p className="font-semibold text-brand-700">
            Você está no plano Cortesia — acesso liberado por nós.
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Tudo liberado, sem cobrança: links e links diretos ilimitados, formulários, leads,
            todos os temas, métricas de um ano e sem a marca LINKFIVE na sua página.
          </p>
        </div>
      )}

      <TabelaPrecos checkouts={checkouts} planoAtual={user.plan} cta="Assinar" />

      {temCobranca ? (
        <div className="card mt-6 p-5">
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
        <p className="mt-6 flex items-start gap-2 text-sm text-ink-500">
          <Minus size={14} className="mt-0.5 shrink-0" />A cobrança ainda não está ativa. A
          estrutura de assinatura já existe no sistema; falta ligar o checkout.
        </p>
      )}
    </div>
  );
}
