"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import type { Page, PageLink, LinkType, LinkConfig } from "@/lib/types";
import { TIPOS } from "@/lib/links";
import { PreviewCelular } from "@/components/editor/PreviewCelular";
import { ModalTipoLink } from "@/components/editor/ModalTipoLink";

/**
 * Editor da página.
 *
 * Painel de edição à esquerda, preview ao vivo à direita. O estado do preview é
 * o mesmo do formulário, então o que o usuário digita aparece na hora — sem
 * salvar e sem recarregar.
 *
 * O salvamento é explícito, por botão. Salvar a cada tecla publicaria edições
 * pela metade numa página que já está no ar.
 */
export function Editor({
  page: pageInicial,
  links: linksIniciais,
  maxLinks,
  podeTema,
  nomePlano,
}: {
  page: Page;
  links: PageLink[];
  maxLinks: number | null;
  podeTema: boolean;
  nomePlano: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(pageInicial);
  const [links, setLinks] = useState(linksIniciais);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);

  const noLimite = maxLinks !== null && links.length >= maxLinks;

  function alterar<K extends keyof Page>(campo: K, valor: Page[K]) {
    setPage((p) => ({ ...p, [campo]: valor }));
    setSalvo(false);
  }

  async function salvarPerfil() {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/pagina", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          title: page.title,
          bio: page.bio,
          avatarUrl: page.avatarUrl,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível salvar.");
        return;
      }
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2200);
      router.refresh();
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setSalvando(false);
    }
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
    router.refresh();
    return true;
  }

  async function alternarAtivo(link: PageLink) {
    // Otimista: o botão responde na hora. Se a API recusar, voltamos ao estado
    // anterior — esperar a resposta faria o toggle parecer travado.
    const antes = links;
    setLinks((ls) => ls.map((l) => (l.id === link.id ? { ...l, active: !l.active } : l)));
    const r = await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !link.active }),
    });
    if (!r.ok) setLinks(antes);
    else router.refresh();
  }

  async function excluir(link: PageLink) {
    if (!confirm(`Excluir "${link.title}"?`)) return;
    const antes = links;
    setLinks((ls) => ls.filter((l) => l.id !== link.id));
    const r = await fetch(`/api/links/${link.id}`, { method: "DELETE" });
    if (!r.ok) setLinks(antes);
    else router.refresh();
  }

  async function soltarEm(destinoId: string) {
    if (!arrastando || arrastando === destinoId) return;
    const atual = [...links];
    const de = atual.findIndex((l) => l.id === arrastando);
    const para = atual.findIndex((l) => l.id === destinoId);
    if (de < 0 || para < 0) return;

    const [movido] = atual.splice(de, 1);
    atual.splice(para, 0, movido);
    setLinks(atual);
    setArrastando(null);

    await fetch("/api/links/ordenar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId: page.id, ids: atual.map((l) => l.id) }),
    });
    router.refresh();
  }

  async function publicar() {
    setSalvando(true);
    try {
      await fetch("/api/pagina/publicar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageId: page.id, publicar: !page.published }),
      });
      setPage((p) => ({ ...p, published: !p.published }));
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Minha página</h1>
          <p className="mt-1 text-sm text-ink-500">
            Tudo que você mudar aqui aparece no preview ao lado.
          </p>
        </div>

        {/* --- Perfil --- */}
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Perfil</h2>

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="titulo">
                Nome da página
              </label>
              <input
                id="titulo"
                className="input"
                value={page.title}
                maxLength={60}
                onChange={(e) => alterar("title", e.target.value)}
                placeholder="Oficina do Carlos"
              />
            </div>

            <div>
              <label className="label" htmlFor="bio">
                Descrição
              </label>
              <textarea
                id="bio"
                className="input min-h-[80px] resize-y"
                value={page.bio ?? ""}
                maxLength={200}
                onChange={(e) => alterar("bio", e.target.value)}
                placeholder="Mecânica geral e elétrica automotiva em Santo André."
              />
              <p className="mt-1 text-xs text-ink-400">{(page.bio ?? "").length}/200</p>
            </div>

            <div>
              <label className="label" htmlFor="avatar">
                Logo ou foto (URL da imagem)
              </label>
              <input
                id="avatar"
                className="input"
                value={page.avatarUrl ?? ""}
                onChange={(e) => alterar("avatarUrl", e.target.value)}
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-ink-400">
                Enquanto o envio de arquivo não entra, cole o endereço de uma imagem já publicada.
              </p>
            </div>

            {erro && <p className="erro">{erro}</p>}

            <div className="flex items-center gap-3">
              <button onClick={salvarPerfil} className="btn-brand" disabled={salvando}>
                {salvando && <Loader2 size={16} className="animate-spin" />}
                Salvar perfil
              </button>
              {salvo && (
                <span className="flex items-center gap-1.5 text-sm text-ok-500">
                  <Check size={15} /> Salvo
                </span>
              )}
            </div>
          </div>
        </section>

        {/* --- Links --- */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Links</h2>
              <p className="text-sm text-ink-500">
                {links.length}
                {maxLinks !== null ? ` de ${maxLinks}` : ""} no plano {nomePlano}
                {" · "}
                arraste para reordenar
              </p>
            </div>
            <button
              onClick={() => setModalAberto(true)}
              className="btn-brand shrink-0"
              disabled={noLimite}
              title={noLimite ? "Limite do plano atingido" : undefined}
            >
              <Plus size={16} /> Adicionar link
            </button>
          </div>

          {noLimite && (
            <p className="mb-4 rounded-[10px] bg-accent-100 px-3.5 py-2.5 text-sm text-ink-800">
              Você usou os {maxLinks} links do plano {nomePlano}. Mude de plano para adicionar mais.
            </p>
          )}

          {links.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-ink-200 px-4 py-10 text-center">
              <p className="text-sm text-ink-500">
                Nenhum link ainda. Comece pelo WhatsApp — é o botão que mais gera cliente.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {links.map((l) => {
                const info = TIPOS[l.type];
                return (
                  <li
                    key={l.id}
                    draggable
                    onDragStart={() => setArrastando(l.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => soltarEm(l.id)}
                    onDragEnd={() => setArrastando(null)}
                    className={`flex items-center gap-3 rounded-[10px] border bg-white px-3 py-2.5 ${
                      arrastando === l.id ? "border-brand-400 opacity-60" : "border-ink-200"
                    }`}
                  >
                    <GripVertical size={16} className="shrink-0 cursor-grab text-ink-300" />

                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: info.cor }}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.title}</p>
                      <p className="truncate text-xs text-ink-400">
                        {info.label}
                        {l.url ? ` · ${l.url.replace(/^https?:\/\//, "")}` : ""}
                      </p>
                    </div>

                    <button
                      onClick={() => alternarAtivo(l)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        l.active ? "bg-ok-500/10 text-ok-500" : "bg-ink-100 text-ink-500"
                      }`}
                      title={l.active ? "Desativar" : "Ativar"}
                    >
                      {l.active ? "Ativo" : "Oculto"}
                    </button>

                    <button
                      onClick={() => excluir(l)}
                      className="shrink-0 text-ink-300 hover:text-danger-500"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* --- Preview --- */}
      <div className="lg:sticky lg:top-[76px] lg:self-start">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink-600">
            <Eye size={15} /> Preview
          </span>
          <button
            onClick={publicar}
            className={page.published ? "btn-ghost" : "btn-accent"}
            disabled={salvando}
          >
            {page.published ? "Despublicar" : "Publicar página"}
          </button>
        </div>

        <PreviewCelular page={page} links={links.filter((l) => l.active)} />

        {!page.published && (
          <p className="mt-3 text-center text-xs text-ink-500">
            A página só fica no ar depois de publicar.
          </p>
        )}
      </div>

      {modalAberto && (
        <ModalTipoLink
          onFechar={() => setModalAberto(false)}
          onCriar={criarLink}
          podeTema={podeTema}
        />
      )}
    </div>
  );
}
