import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { plano, proximoPlano } from "@/lib/limites";
import { contarCurtos, contarCurtosNoMes, contarPaginas } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * O que você já usou do seu plano.
 *
 * Existe para o limite ser previsível. Sem esta tela, o cliente só descobre a
 * cota no momento em que ela o barra — e limite descoberto por frustração vira
 * cancelamento, não upgrade.
 *
 * Por isso a data em que a cota volta aparece em letras: "zera em 1º de
 * outubro" transforma um bloqueio em espera.
 */
function primeiroDoMesQueVem(): string {
  const hoje = new Date();
  const proximo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  return proximo.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

function Barra({
  rotulo,
  usado,
  limite,
  nota,
}: {
  rotulo: string;
  usado: number;
  /** `null` = ilimitado. */
  limite: number | null;
  nota?: string;
}) {
  const ilimitado = limite === null;
  const pct = ilimitado ? 0 : Math.min((usado / limite) * 100, 100);
  const cheio = !ilimitado && usado >= limite;
  // 80% é onde vale avisar: ainda dá tempo de decidir sem estar travado.
  const perto = !cheio && pct >= 80;

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{rotulo}</span>
        <span className={cheio ? "font-semibold text-danger-500" : "text-ink-600"}>
          {usado.toLocaleString("pt-BR")}
          {ilimitado ? (
            <span className="text-ink-400"> / ilimitado</span>
          ) : (
            <span className="text-ink-400"> / {limite.toLocaleString("pt-BR")}</span>
          )}
        </span>
      </div>

      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full ${
            cheio ? "bg-danger-500" : perto ? "bg-accent-500" : "bg-brand-500"
          }`}
          style={{ width: ilimitado ? "6%" : `${Math.max(pct, usado > 0 ? 2 : 0)}%` }}
        />
      </div>

      {(nota || cheio || perto) && (
        <p
          className={`mt-1 text-xs ${
            cheio ? "font-medium text-danger-500" : perto ? "text-warn-500" : "text-ink-400"
          }`}
        >
          {cheio ? "Limite atingido." : perto ? "Chegando no limite." : nota}
        </p>
      )}
    </li>
  );
}

export default async function Consumo() {
  const user = await requireUser();
  const p = plano(user.plan);
  const up = proximoPlano(user.plan);

  const [paginas, curtosAtivos, curtosNoMes] = await Promise.all([
    contarPaginas(user.id),
    contarCurtos(user.id),
    contarCurtosNoMes(user.id),
  ]);

  return (
    <div className="mx-auto max-w-[720px] space-y-5 px-5 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Consumo</h1>
        <p className="mt-1 text-sm text-ink-500">
          O que você já usou do plano <strong>{p.nome}</strong>.
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Neste momento</h2>
        <ul className="space-y-4">
          <Barra rotulo="Páginas" usado={paginas} limite={p.maxPaginas} />
          <Barra
            rotulo="Links diretos ativos"
            usado={curtosAtivos}
            limite={p.maxCurtos}
            nota="Pausar ou excluir um link libera espaço aqui."
          />
          <Barra rotulo="Pessoas na conta" usado={1} limite={p.maxMembros} />
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Neste mês</h2>
        <p className="mb-4 mt-0.5 text-sm text-ink-500">
          Zera em {primeiroDoMesQueVem()}.
        </p>
        <ul className="space-y-4">
          <Barra
            rotulo="Links diretos criados"
            usado={curtosNoMes}
            limite={p.maxCurtosMes}
            nota="A cota vale para links novos; os que já existem continuam funcionando."
          />
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Histórico de métricas</h2>
        <p className="text-sm text-ink-600">
          O plano {p.nome} guarda{" "}
          <strong>
            {p.analyticsDias >= 365 ? "um ano" : `${p.analyticsDias} dias`} de histórico
          </strong>
          . Visitas e cliques mais antigos que isso não aparecem no Analytics.
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
          <li>
            {p.metricasDetalhadas ? "✓" : "🔒"} Origem das visitas e tipo de aparelho
          </li>
          <li>{p.metricasGeo ? "✓" : "🔒"} País de origem</li>
          <li>{p.gestaoLinks ? "✓" : "🔒"} Expiração, senha e troca de destino nos links</li>
          <li>{p.formularios ? "✓" : "🔒"} Formulário de captura e painel de leads</li>
        </ul>
      </section>

      {up && (
        <div className="card flex flex-wrap items-center gap-3 border-brand-200 bg-brand-50 p-4">
          <p className="flex-1 text-sm text-ink-700">
            No plano <strong>{up.nome}</strong> os limites sobem e o histórico vai a{" "}
            {up.analyticsDias >= 365 ? "um ano" : `${up.analyticsDias} dias`}.
          </p>
          <Link href="/app/planos" className="btn-brand">
            Ver planos
          </Link>
        </div>
      )}
    </div>
  );
}
