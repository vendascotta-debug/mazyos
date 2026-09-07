import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, MessageCircle, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { janelaAnalytics, plano } from "@/lib/limites";
import { leadsDaPagina, paginaDoUsuario, ranking, serieDiaria, somarTotais } from "@/lib/repo";
import { GraficoLinha } from "@/components/app/GraficoLinha";
import { TIPOS } from "@/lib/links";
import type { LinkType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  if (!page) redirect("/onboarding");

  const p = plano(user.plan);
  // O plano recorta a janela: o Free vê 7 dias mesmo que a tela peça 30.
  const { dias, cortado } = janelaAnalytics(user.plan, 30);

  const serie = await serieDiaria(user.id, page.id, dias);
  const totais = somarTotais(serie);
  const top = await ranking(user.id, page.id, dias);
  const ultimosLeads = p.formularios ? await leadsDaPagina(user.id, page.id, 5) : [];

  const cards = [
    { label: "Visualizações", valor: totais.views, icone: Eye, cor: "#5b3df5" },
    { label: "Cliques", valor: totais.clicks, icone: MousePointerClick, cor: "#0891b2" },
    { label: "Cliques no WhatsApp", valor: totais.whatsappClicks, icone: MessageCircle, cor: "#16a34a" },
    { label: "Leads", valor: totais.leads, icone: Users, cor: "#db2777" },
    { label: "Taxa de conversão", valor: `${totais.conversao}%`, icone: TrendingUp, cor: "#ffb020" },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-5 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Olá, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-500">
          Resultados dos últimos {dias} dias
          {cortado && (
            <>
              {" · "}
              <Link href="/app/planos" className="text-brand-600 hover:underline">
                o plano {p.nome} mostra {p.analyticsDias} dias
              </Link>
            </>
          )}
        </p>
      </div>

      {!page.published && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-accent-300 bg-accent-100 px-4 py-3.5">
          <p className="flex-1 text-sm text-ink-800">
            Sua página ainda é um rascunho — ninguém consegue abrir ela.
          </p>
          <Link href="/app/pagina" className="btn-accent">
            Publicar agora
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(({ label, valor, icone: Icone, cor }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-2">
              <Icone size={15} style={{ color: cor }} />
              <p className="text-xs font-medium text-ink-500">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Visualizações por dia</h2>
          <GraficoLinha serie={serie} campo="views" cor="#5b3df5" />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Cliques por dia</h2>
          <GraficoLinha serie={serie} campo="clicks" cor="#0891b2" />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Links mais acessados</h2>
          {top.length === 0 ? (
            <p className="text-sm text-ink-400">
              Nenhum link ainda.{" "}
              <Link href="/app/pagina" className="text-brand-600 hover:underline">
                Adicionar o primeiro
              </Link>
            </p>
          ) : (
            <ol className="space-y-2.5">
              {top.map((l, i) => {
                const maior = top[0].cliques || 1;
                return (
                  <li key={l.id} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-sm font-semibold text-ink-300">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{l.title}</p>
                        <span className="shrink-0 text-sm font-semibold">{l.cliques}</span>
                      </div>
                      {/* Barra proporcional ao primeiro colocado: mostra a
                          distância entre os links, não só a ordem. */}
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max((l.cliques / maior) * 100, 2)}%`,
                            background: TIPOS[l.type as LinkType]?.cor ?? "#5b3df5",
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Últimos leads</h2>
          {!p.formularios ? (
            <div className="rounded-[10px] bg-ink-50 px-4 py-5 text-center">
              <p className="text-sm text-ink-600">
                A captura de leads entra a partir do plano Pro.
              </p>
              <Link href="/app/planos" className="btn-brand mt-3">
                Ver planos
              </Link>
            </div>
          ) : ultimosLeads.length === 0 ? (
            <p className="text-sm text-ink-400">Nenhum lead recebido ainda.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {ultimosLeads.map((l) => (
                <li key={l.id} className="py-2.5">
                  <p className="text-sm font-medium">{l.name ?? "Sem nome"}</p>
                  <p className="text-xs text-ink-500">
                    {[l.whatsapp, l.email].filter(Boolean).join(" · ") || "Sem contato"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
