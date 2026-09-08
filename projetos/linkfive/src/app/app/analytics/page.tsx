import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { janelaAnalytics, plano } from "@/lib/limites";
import {
  paginaDoUsuario,
  ranking,
  rankingDispositivos,
  rankingOrigens,
  rankingPaises,
  serieDiaria,
  somarTotais,
} from "@/lib/repo";
import { GraficoLinha } from "@/components/app/GraficoLinha";
import {
  AMOSTRA_DISPOSITIVOS,
  AMOSTRA_ORIGENS,
  AMOSTRA_PAISES,
  Bloqueado,
  ListaFatias,
} from "@/components/app/Bloqueado";

export const dynamic = "force-dynamic";

/** Períodos do filtro. O plano recorta: o Grátis pede 90 e recebe 3. */
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

  // Só consulta o que o plano mostra: buscar dado para depois esconder é
  // trabalho de banco jogado fora em toda visita à tela.
  const origens = p.metricasDetalhadas ? await rankingOrigens(user.id, page.id, dias) : [];
  const dispositivos = p.metricasDetalhadas
    ? await rankingDispositivos(user.id, page.id, dias)
    : [];
  const paises = p.metricasGeo ? await rankingPaises(user.id, page.id, dias) : [];

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
            {cortado ? (
              <>
                O plano {p.nome} guarda {p.analyticsDias} dias de histórico.{" "}
                <Link href="/app/planos" className="text-brand-600 hover:underline">
                  Ver planos
                </Link>
              </>
            ) : (
              `Últimos ${dias} dias.`
            )}
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

      {/* --- De onde vem e em que aparelho --- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden p-5">
          <h2 className="mb-4 font-semibold">De onde vieram</h2>
          {p.metricasDetalhadas ? (
            <ListaFatias fatias={origens} />
          ) : (
            <Bloqueado
              titulo="Descubra de onde vem sua audiência"
              descricao="Instagram, Google, WhatsApp ou acesso direto — saiba onde investir seu tempo."
              planoNecessario="starter"
            >
              <ListaFatias fatias={AMOSTRA_ORIGENS} />
            </Bloqueado>
          )}
        </section>

        <section className="card overflow-hidden p-5">
          <h2 className="mb-4 font-semibold">Em que aparelho</h2>
          {p.metricasDetalhadas ? (
            <ListaFatias fatias={dispositivos} cor="#0891b2" />
          ) : (
            <Bloqueado
              titulo="Celular, tablet ou computador"
              descricao="Saiba em que tela sua página é aberta e ajuste o que aparece primeiro."
              planoNecessario="starter"
            >
              <ListaFatias fatias={AMOSTRA_DISPOSITIVOS} cor="#0891b2" />
            </Bloqueado>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden p-5">
          <h2 className="mb-4 font-semibold">Países</h2>
          {p.metricasGeo ? (
            <ListaFatias fatias={paises} cor="#db2777" />
          ) : (
            <Bloqueado
              titulo="De que país abriram sua página"
              descricao="Útil para quem atende fora do Brasil ou vende para brasileiros no exterior."
              planoNecessario="pro"
            >
              <ListaFatias fatias={AMOSTRA_PAISES} cor="#db2777" />
            </Bloqueado>
          )}
        </section>

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
    </div>
  );
}
