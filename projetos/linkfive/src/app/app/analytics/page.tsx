import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { janelaAnalytics, plano } from "@/lib/limites";
import { paginaDoUsuario, ranking, serieDiaria, somarTotais } from "@/lib/repo";
import { GraficoLinha } from "@/components/app/GraficoLinha";

export const dynamic = "force-dynamic";

/** Períodos do filtro. O plano recorta: o Free pede 90 e recebe 7. */
const PERIODOS = [
  { chave: "hoje", label: "Hoje", dias: 1 },
  { chave: "7d", label: "7 dias", dias: 7 },
  { chave: "30d", label: "30 dias", dias: 30 },
  { chave: "90d", label: "90 dias", dias: 90 },
];

export default async function Analytics({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  if (!page) redirect("/onboarding");

  const { periodo } = await searchParams;
  const escolhido = PERIODOS.find((p) => p.chave === periodo) ?? PERIODOS[2];
  const p = plano(user.plan);
  const { dias, cortado } = janelaAnalytics(user.plan, escolhido.dias);

  const serie = await serieDiaria(user.id, page.id, dias);
  const totais = somarTotais(serie);
  const top = await ranking(user.id, page.id, dias, 10);

  const cards: [string, string | number][] = [
    ["Visualizações", totais.views],
    ["Cliques", totais.clicks],
    ["WhatsApp", totais.whatsappClicks],
    ["Leads", totais.leads],
    ["Conversão", `${totais.conversao}%`],
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 px-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-ink-500">
            {cortado ? `O plano ${p.nome} mostra ${p.analyticsDias} dias.` : `Últimos ${dias} dias.`}
          </p>
        </div>

        <nav className="flex gap-1 rounded-[10px] border border-ink-200 bg-white p-1">
          {PERIODOS.map((op) => (
            <a
              key={op.chave}
              href={`/app/analytics?periodo=${op.chave}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                op.chave === escolhido.chave
                  ? "bg-brand-500 font-medium text-white"
                  : "text-ink-600 hover:bg-ink-50"
              }`}
            >
              {op.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(([label, valor]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-medium text-ink-500">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Visualizações</h2>
          <GraficoLinha serie={serie} campo="views" cor="#5b3df5" altura={200} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Cliques</h2>
          <GraficoLinha serie={serie} campo="clicks" cor="#0891b2" altura={200} />
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Cliques por link</h2>
        {top.length === 0 ? (
          <p className="text-sm text-ink-400">Nenhum clique no período.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {top.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-sm">{l.title}</span>
                <span className="shrink-0 text-sm font-semibold">{l.cliques}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
