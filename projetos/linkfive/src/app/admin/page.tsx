import Link from "next/link";
import { indicadores } from "@/lib/admin";
import { PLANOS, ORDEM_PLANOS, ORDEM_PLANOS_ADMIN, precoFormatado } from "@/lib/limites";

export const dynamic = "force-dynamic";

export default async function AdminVisaoGeral() {
  const i = await indicadores();

  // Receita mensal recorrente: o número que diz se o negócio existe.
  const mrrCents = ORDEM_PLANOS.reduce(
    (soma, id) => soma + PLANOS[id].precoCents * i.porPlano[id],
    0,
  );
  const mrr = (mrrCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // `para` leva à lista já filtrada. Os cards sem destino são totais que não
  // correspondem a um recorte de clientes — fingir que são clicáveis só
  // frustraria quem clica.
  const cards = [
    {
      label: "Contas",
      valor: i.usuarios,
      nota: `${i.usuariosNovos7d} nos últimos 7 dias`,
      para: "/admin/clientes",
    },
    {
      label: "Pagantes",
      valor: i.pagantes,
      nota: `${i.porPlano.free} no Free`,
      para: "/admin/clientes?filtro=pagantes",
    },
    {
      label: "Cortesias",
      valor: i.cortesias,
      nota: "acesso concedido por você",
      para: "/admin/clientes?filtro=cortesia",
    },
    {
      label: "Receita mensal",
      valor: mrr,
      nota: "soma dos planos ativos",
      para: "/admin/clientes?filtro=pagantes",
    },
    {
      label: "Páginas publicadas",
      valor: i.paginasPublicadas,
      nota: `${i.paginas - i.paginasPublicadas} em rascunho`,
      para: "/admin/clientes?filtro=publicadas",
    },
    { label: "Visualizações", valor: i.views, nota: "total acumulado" },
    { label: "Cliques na página", valor: i.cliques, nota: `${i.links} links criados` },
    { label: "Cliques em link direto", valor: i.cliquesCurtos, nota: `${i.curtos} links diretos` },
    {
      label: "Leads capturados",
      valor: i.leads,
      nota: "de todos os clientes",
      para: "/admin/clientes?filtro=com-leads",
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-5 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Visão geral</h1>
        <p className="mt-1 text-sm text-ink-500">Como o LINKFIVE está indo, no total.</p>
      </div>

      {i.usuarios === 0 && (
        <div className="card border-accent-300 bg-accent-100 p-4 text-sm text-ink-800">
          Nenhuma conta ainda. Os números aparecem assim que o primeiro cliente se cadastrar.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const miolo = (
            <>
              <p className="text-xs font-medium text-ink-500">{c.label}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight">{c.valor}</p>
              <p className="mt-1 text-xs text-ink-400">{c.nota}</p>
            </>
          );

          if (!c.para) {
            return (
              <div key={c.label} className="card p-4">
                {miolo}
              </div>
            );
          }

          return (
            <Link
              key={c.label}
              href={c.para}
              className="card block p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {miolo}
              <span className="mt-2 block text-xs font-medium text-brand-600">Ver clientes →</span>
            </Link>
          );
        })}
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Contas por plano</h2>

        <ul className="space-y-3">
          {ORDEM_PLANOS_ADMIN.map((id) => {
            const p = PLANOS[id];
            const n = i.porPlano[id];
            const pct = i.usuarios ? (n / i.usuarios) * 100 : 0;
            return (
              <li key={id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {p.nome}{" "}
                    <span className="text-ink-400">
                      · {precoFormatado(p)}
                      {p.precoCents > 0 ? "/mês" : ""}
                    </span>
                  </span>
                  <span className="font-semibold">
                    {n}
                    {n > 0 && p.precoCents > 0 && (
                      <span className="ml-2 text-ink-400">
                        {((p.precoCents * n) / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max(pct, n > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-xs text-ink-400">
          A cobrança ainda não está ligada. Estes números refletem os planos concedidos à mão em{" "}
          <Link href="/admin/clientes" className="text-brand-600 hover:underline">
            Clientes
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
