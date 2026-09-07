"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import type { LinkConfig, LinkType, Page, PageLink } from "@/lib/types";
import type { Tema } from "@/lib/temas";
import { TIPOS } from "@/lib/links";
import { Logo } from "@/components/ui/Logo";
import { PreviewCelular } from "@/components/editor/PreviewCelular";
import { ModalTipoLink } from "@/components/editor/ModalTipoLink";

/**
 * Onboarding em 5 etapas.
 *
 * Cada etapa grava ao avançar, e não só no fim. Se o usuário fechar a aba na
 * etapa 3, o que ele já preencheu está salvo — perder o trabalho logo no
 * primeiro contato com o produto é a pior hora possível.
 */
const ETAPAS = [
  "Qual é o nome da sua página?",
  "Adicione sua foto ou logo",
  "Adicione seus primeiros links",
  "Personalize sua página",
  "Publique sua página",
];

export function Onboarding({
  page: pageInicial,
  links: linksIniciais,
  temas,
  podeTema,
  site,
}: {
  page: Page;
  links: PageLink[];
  temas: Tema[];
  podeTema: boolean;
  site: string;
}) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(0);
  const [page, setPage] = useState(pageInicial);
  const [links, setLinks] = useState(linksIniciais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pronto, setPronto] = useState(false);

  const url = `${site}/${page.slug}`;

  async function gravar(campos: Record<string, unknown>) {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/pagina", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageId: page.id, ...campos }),
      });
      if (!r.ok) {
        const d = await r.json();
        setErro(d.erro ?? "Não foi possível salvar.");
        return false;
      }
      return true;
    } catch {
      setErro("Falha de conexão.");
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function avancar() {
    if (etapa === 0 && !(await gravar({ title: page.title }))) return;
    if (etapa === 1 && !(await gravar({ avatarUrl: page.avatarUrl }))) return;
    // A etapa 3 (tema) já grava na hora do clique.
    setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1));
  }

  async function criarLink(tipo: LinkType, titulo: string, entrada: string, config: LinkConfig) {
    const r = await fetch("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId: page.id, type: tipo, title: titulo, url: entrada, config }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErro(d.erro ?? "Não foi possível criar o link.");
      return false;
    }
    setLinks((ls) => [...ls, d.link]);
    return true;
  }

  async function excluirLink(id: string) {
    const antes = links;
    setLinks((ls) => ls.filter((l) => l.id !== id));
    const r = await fetch(`/api/links/${id}`, { method: "DELETE" });
    if (!r.ok) setLinks(antes);
  }

  async function escolherTema(temaId: string) {
    const antes = page.themeId;
    setPage((p) => ({ ...p, themeId: temaId }));
    const r = await fetch("/api/pagina", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId: page.id, themeId: temaId }),
    });
    if (!r.ok) setPage((p) => ({ ...p, themeId: antes }));
  }

  async function publicar() {
    setSalvando(true);
    try {
      const r = await fetch("/api/pagina/publicar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageId: page.id, publicar: true }),
      });
      if (r.ok) {
        setPage((p) => ({ ...p, published: true }));
        setPronto(true);
        router.refresh();
      }
    } finally {
      setSalvando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem permissão: o link continua visível na tela pra copiar na mão.
    }
  }

  // --- Tela final ---------------------------------------------------------

  if (pronto) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-5 py-10">
        <div className="card w-full max-w-[460px] p-7 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-500/10">
            <Check size={28} className="text-ok-500" />
          </span>

          <h1 className="mt-4 text-xl font-bold tracking-tight">Sua página está pronta.</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Ela já está no ar. Divulgue esse link e comece a receber contatos.
          </p>

          <button
            onClick={copiar}
            className="mt-5 flex w-full items-center justify-between gap-2 rounded-[10px] border border-ink-200 bg-ink-50 px-3.5 py-3 text-sm"
          >
            <span className="min-w-0 truncate font-medium text-brand-600">
              {url.replace(/^https?:\/\//, "")}
            </span>
            {copiado ? (
              <Check size={16} className="shrink-0 text-ok-500" />
            ) : (
              <Copy size={16} className="shrink-0 text-ink-400" />
            )}
          </button>

          <div
            className="mx-auto mt-5 w-[170px] rounded-[12px] border border-ink-200 bg-white p-2.5"
            // O QR já sai pronto da rota do servidor — a tela não precisa de
            // biblioteca de QR no cliente.
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/qrcode?formato=svg" alt="QR Code da sua página" className="w-full" />
          </div>
          <p className="mt-2 text-xs text-ink-400">Imprima e coloque na vitrine ou no balcão.</p>

          <div className="mt-6 flex flex-col gap-2">
            <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" className="btn-brand">
              <ExternalLink size={16} /> Visualizar minha página
            </a>
            <a href="/app" className="btn-ghost">
              Ir para o painel
            </a>
          </div>
        </div>
      </main>
    );
  }

  // --- Wizard -------------------------------------------------------------

  return (
    <main className="min-h-screen bg-ink-50">
      <header className="flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4">
        <Logo />
        <a href="/app" className="text-sm text-ink-500 hover:text-ink-900">
          Pular por enquanto
        </a>
      </header>

      <div className="mx-auto grid max-w-[1000px] gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-6">
            <div className="flex gap-1.5">
              {ETAPAS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i <= etapa ? "bg-brand-500" : "bg-ink-200"}`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-ink-400">
              Etapa {etapa + 1} de {ETAPAS.length}
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">{ETAPAS[etapa]}</h1>
          </div>

          <div className="card p-5">
            {etapa === 0 && (
              <div>
                <label className="label" htmlFor="titulo">
                  Nome que aparece no topo da página
                </label>
                <input
                  id="titulo"
                  className="input"
                  value={page.title}
                  maxLength={60}
                  autoFocus
                  onChange={(e) => setPage((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Oficina do Carlos"
                />

                <label className="label mt-4" htmlFor="bio">
                  Uma linha sobre o que você faz (opcional)
                </label>
                <input
                  id="bio"
                  className="input"
                  value={page.bio ?? ""}
                  maxLength={200}
                  onChange={(e) => setPage((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Mecânica geral e elétrica em Santo André."
                />
              </div>
            )}

            {etapa === 1 && (
              <div>
                <label className="label" htmlFor="avatar">
                  Endereço da imagem
                </label>
                <input
                  id="avatar"
                  className="input"
                  value={page.avatarUrl ?? ""}
                  autoFocus
                  onChange={(e) => setPage((p) => ({ ...p, avatarUrl: e.target.value }))}
                  placeholder="https://..."
                />
                <p className="mt-2 text-sm text-ink-500">
                  Ainda não dá pra enviar arquivo — cole o endereço de uma imagem já publicada, ou
                  pule e faça isso depois. Sem imagem, a página mostra suas iniciais.
                </p>
              </div>
            )}

            {etapa === 2 && (
              <div>
                {links.length === 0 ? (
                  <p className="mb-4 text-sm text-ink-500">
                    Comece pelo WhatsApp. É o botão que mais gera cliente.
                  </p>
                ) : (
                  <ul className="mb-4 space-y-2">
                    {links.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 rounded-[10px] border border-ink-200 px-3 py-2.5"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: TIPOS[l.type].cor }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {l.title}
                        </span>
                        <button
                          onClick={() => excluirLink(l.id)}
                          className="text-ink-300 hover:text-danger-500"
                          title="Remover"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button onClick={() => setModal(true)} className="btn-ghost w-full">
                  <Plus size={16} /> Adicionar link
                </button>
              </div>
            )}

            {etapa === 3 && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {temas.map((t) => {
                  const bloqueado = !podeTema && t.id !== "clean";
                  return (
                    <button
                      key={t.id}
                      onClick={() => !bloqueado && escolherTema(t.id)}
                      disabled={bloqueado}
                      className={`rounded-[12px] border p-3 text-left ${
                        page.themeId === t.id ? "border-brand-500 ring-2 ring-brand-100" : "border-ink-200"
                      } ${bloqueado ? "cursor-not-allowed opacity-50" : "hover:border-brand-400"}`}
                    >
                      <div
                        className="mb-2 flex h-10 items-center gap-1.5 rounded-[8px] px-2"
                        style={{ background: t.vars.fundo }}
                      >
                        <span
                          className="h-3.5 flex-1 rounded"
                          style={{ background: t.vars.botaoFundo, border: `1px solid ${t.vars.botaoBorda}` }}
                        />
                        <span className="h-3.5 flex-1 rounded" style={{ background: t.vars.destaque }} />
                      </div>
                      <p className="text-sm font-semibold">{t.nome}</p>
                      <p className="text-xs text-ink-500">{t.indicado}</p>
                      {bloqueado && <p className="mt-1 text-[11px] text-ink-400">Plano Starter</p>}
                    </button>
                  );
                })}
              </div>
            )}

            {etapa === 4 && (
              <div>
                <p className="text-sm text-ink-600">
                  Tudo pronto. Ao publicar, sua página fica acessível neste endereço:
                </p>
                <p className="mt-2 break-all font-semibold text-brand-600">{url}</p>
                <p className="mt-3 text-sm text-ink-500">
                  Você pode editar tudo depois, quantas vezes quiser.
                </p>
              </div>
            )}

            {erro && <p className="erro">{erro}</p>}

            <div className="mt-5 flex items-center gap-2">
              {etapa > 0 && (
                <button onClick={() => setEtapa((e) => e - 1)} className="btn-ghost">
                  Voltar
                </button>
              )}

              {etapa < ETAPAS.length - 1 ? (
                <button onClick={avancar} className="btn-brand flex-1" disabled={salvando}>
                  {salvando && <Loader2 size={16} className="animate-spin" />}
                  Continuar <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={publicar} className="btn-accent flex-1" disabled={salvando}>
                  {salvando && <Loader2 size={16} className="animate-spin" />}
                  Publicar minha página
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <PreviewCelular page={page} links={links.filter((l) => l.active)} />
        </div>
      </div>

      {modal && <ModalTipoLink onFechar={() => setModal(false)} onCriar={criarLink} />}
    </main>
  );
}
