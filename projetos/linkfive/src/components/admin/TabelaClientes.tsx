"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Pause, Play, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import type { Cliente } from "@/lib/admin";
import { ORDEM_PLANOS_ADMIN, PLANOS } from "@/lib/limites";

/**
 * A lista de clientes.
 *
 * Cada linha responde à pergunta que o dono do negócio faz: quem é, o que está
 * usando, e o produto está funcionando pra ele? Por isso o movimento
 * (visualizações, cliques, leads) fica na mesma linha do plano — sem isso, a
 * tela vira só um cadastro.
 */
export function TabelaClientes({
  clientes: iniciais,
  busca: buscaInicial,
  meuId,
  site,
}: {
  clientes: Cliente[];
  busca: string;
  meuId: string;
  site: string;
}) {
  const router = useRouter();
  const [lista, setLista] = useState(iniciais);
  const [busca, setBusca] = useState(buscaInicial);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function acao(id: string, corpo: Record<string, unknown>, otimista: Partial<Cliente>) {
    const antes = lista;
    setLista((cs) => cs.map((c) => (c.id === id ? { ...c, ...otimista } : c)));
    setOcupado(id);
    setErro(null);

    const r = await fetch(`/api/admin/cliente/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    setOcupado(null);

    if (!r.ok) {
      setLista(antes);
      const d = await r.json().catch(() => ({}));
      setErro(d.erro ?? "Não foi possível aplicar a mudança.");
      return;
    }
    router.refresh();
  }

  /**
   * Exclui a conta.
   *
   * Pede confirmação com o e-mail escrito por extenso: numa lista de linhas
   * parecidas, "tem certeza?" sozinho não impede o clique na linha errada — e
   * aqui não há desfazer.
   */
  async function excluir(c: Cliente) {
    const certeza = window.confirm(
      `Excluir a conta de ${c.email}?

` +
        `A página, os links, as métricas e os leads dessa conta somem junto. ` +
        `Não dá para desfazer.

` +
        `O histórico de pagamento é preservado.`,
    );
    if (!certeza) return;

    setOcupado(c.id);
    setErro(null);
    const r = await fetch(`/api/admin/cliente/${c.id}`, { method: "DELETE" });
    setOcupado(null);

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErro(d.erro ?? "Não foi possível excluir a conta.");
      return;
    }
    setLista((cs) => cs.filter((x) => x.id !== c.id));
    router.refresh();
  }

  function quandoFoi(iso: string | null): string {
    if (!iso) return "—";
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (dias === 0) return "hoje";
    if (dias === 1) return "ontem";
    if (dias < 30) return `${dias} dias`;
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  return (
    <>
      <form className="mt-5 flex gap-2" action="/admin/clientes">
        <div className="flex flex-1 items-center rounded-[10px] border border-ink-200 bg-white px-3 focus-within:border-brand-500">
          <Search size={16} className="shrink-0 text-ink-400" />
          <input
            name="busca"
            className="min-w-0 flex-1 bg-transparent px-2.5 py-2.5 text-sm outline-none"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou endereço da página"
          />
        </div>
        <button type="submit" className="btn-brand">
          Buscar
        </button>
      </form>

      {erro && <p className="erro mt-3">{erro}</p>}

      {lista.length === 0 ? (
        <div className="card mt-5 px-5 py-12 text-center text-sm text-ink-500">
          {buscaInicial ? "Nenhum cliente encontrado." : "Nenhuma conta cadastrada ainda."}
        </div>
      ) : (
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-ink-200 text-left text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Página</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 text-right font-medium">Links</th>
                <th className="px-4 py-3 text-right font-medium">Visitas</th>
                <th className="px-4 py-3 text-right font-medium">Cliques</th>
                <th className="px-4 py-3 text-right font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">Última visita</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-ink-100">
              {lista.map((c) => (
                <tr key={c.id} className={ocupado === c.id ? "opacity-50" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {c.nome}
                      {c.papel === "admin" && (
                        <span className="ml-2 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-warn-500">
                          ADMIN
                        </span>
                      )}
                      {/* Conta pausada precisa gritar na lista: é o estado em
                          que o cliente está trancado do lado de fora. */}
                      {c.pausada && (
                        <span className="ml-2 rounded-full bg-danger-500/10 px-2 py-0.5 text-[10px] font-bold text-danger-500">
                          PAUSADA
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-500">{c.email}</p>
                    <p className="text-xs text-ink-400">
                      desde {new Date(c.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {c.slug ? (
                      <>
                        <a
                          href={`${site}/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
                        >
                          /{c.slug} <ExternalLink size={12} />
                        </a>
                        <p className="mt-0.5 text-xs">
                          {c.suspensa ? (
                            <span className="font-semibold text-danger-500">suspensa</span>
                          ) : c.publicada ? (
                            <span className="text-ok-500">no ar</span>
                          ) : (
                            <span className="text-ink-400">rascunho</span>
                          )}
                        </p>
                      </>
                    ) : (
                      <span className="text-ink-400">sem página</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {/* Enquanto o gateway não existe, o plano é concedido aqui.
                        É a única forma de dar Pro pra alguém. */}
                    <select
                      value={c.plano}
                      disabled={ocupado === c.id}
                      onChange={(e) =>
                        acao(c.id, { plano: e.target.value }, {
                          plano: e.target.value as Cliente["plano"],
                        })
                      }
                      className="rounded-[8px] border border-ink-200 bg-white px-2 py-1.5 text-sm"
                    >
                      {ORDEM_PLANOS_ADMIN.map((id) => (
                        <option key={id} value={id}>
                          {PLANOS[id].nome}
                          {PLANOS[id].oculto ? " (só admin)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3 text-right">
                    {c.links}
                    {c.curtos > 0 && <span className="text-ink-400"> +{c.curtos}d</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{c.views}</td>
                  <td className="px-4 py-3 text-right font-medium">{c.cliques}</td>
                  <td className="px-4 py-3 text-right font-medium">{c.leads}</td>
                  <td className="px-4 py-3 text-ink-500">{quandoFoi(c.ultimaAtividade)}</td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      {c.pageId && (
                        <button
                          onClick={() =>
                            acao(
                              c.id,
                              { suspender: !c.suspensa },
                              { suspensa: !c.suspensa },
                            )
                          }
                          disabled={ocupado === c.id}
                          className="text-left text-xs font-medium text-ink-500 hover:text-danger-500"
                        >
                          {c.suspensa ? "Reativar página" : "Suspender página"}
                        </button>
                      )}

                      {/* Nunca deixa o admin tirar o próprio acesso: ele
                          ficaria trancado do lado de fora do painel. */}
                      {c.id !== meuId && (
                        <button
                          onClick={() =>
                            acao(
                              c.id,
                              { papel: c.papel === "admin" ? "user" : "admin" },
                              { papel: c.papel === "admin" ? "user" : "admin" },
                            )
                          }
                          disabled={ocupado === c.id}
                          className="inline-flex items-center gap-1 text-left text-xs font-medium text-ink-500 hover:text-brand-600"
                        >
                          {c.papel === "admin" ? (
                            <>
                              <ShieldOff size={12} /> Remover admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={12} /> Tornar admin
                            </>
                          )}
                        </button>
                      )}

                      {/* Pausar a conta impede o DONO de entrar. É diferente de
                          suspender a página, que só a tira do ar. */}
                      {c.id !== meuId && (
                        <button
                          onClick={() =>
                            acao(c.id, { pausarConta: !c.pausada }, { pausada: !c.pausada })
                          }
                          disabled={ocupado === c.id}
                          className="inline-flex items-center gap-1 text-left text-xs font-medium text-ink-500 hover:text-warn-500"
                        >
                          {c.pausada ? (
                            <>
                              <Play size={12} /> Reativar conta
                            </>
                          ) : (
                            <>
                              <Pause size={12} /> Pausar conta
                            </>
                          )}
                        </button>
                      )}

                      {c.id !== meuId && c.papel !== "admin" && (
                        <button
                          onClick={() => excluir(c)}
                          disabled={ocupado === c.id}
                          className="inline-flex items-center gap-1 text-left text-xs font-medium text-ink-400 hover:text-danger-500"
                        >
                          <Trash2 size={12} /> Excluir conta
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-400">
        Mostrando até 200 contas, das mais novas para as mais antigas.
      </p>
    </>
  );
}
