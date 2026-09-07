"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2, Plus, QrCode, Trash2 } from "lucide-react";
import type { ShortLink } from "@/lib/curtos";
import { formatarTelefone } from "@/lib/links";
import { ModalCurto } from "@/components/curtos/ModalCurto";

/**
 * Lista dos links curtos diretos.
 *
 * Cada cartão mostra o QR ao lado do link, e não escondido atrás de um botão:
 * é o QR que o usuário vem buscar aqui, pra imprimir ou mandar pro designer.
 */
export function ListaCurtos({
  curtos: iniciais,
  maxCurtos,
  nomePlano,
  site,
}: {
  curtos: ShortLink[];
  maxCurtos: number | null;
  nomePlano: string;
  site: string;
}) {
  const router = useRouter();
  const [curtos, setCurtos] = useState(iniciais);
  const [modal, setModal] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const noLimite = maxCurtos !== null && curtos.length >= maxCurtos;
  const urlDe = (c: ShortLink) => `${site}/w/${c.code}`;

  async function copiar(c: ShortLink) {
    try {
      await navigator.clipboard.writeText(urlDe(c));
      setCopiado(c.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      // Sem permissão de área de transferência: o link segue visível na tela.
    }
  }

  async function alternar(c: ShortLink) {
    const antes = curtos;
    setCurtos((cs) => cs.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    setOcupado(c.id);
    const r = await fetch(`/api/curtos/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    setOcupado(null);
    if (!r.ok) setCurtos(antes);
    else router.refresh();
  }

  async function excluir(c: ShortLink) {
    if (
      !confirm(
        `Excluir "${c.title}"?\n\nO endereço ${urlDe(c)} para de funcionar na hora, e todo QR Code já impresso com ele deixa de abrir.`,
      )
    ) {
      return;
    }
    const antes = curtos;
    setCurtos((cs) => cs.filter((x) => x.id !== c.id));
    const r = await fetch(`/api/curtos/${c.id}`, { method: "DELETE" });
    if (!r.ok) setCurtos(antes);
    else router.refresh();
  }

  async function criar(dados: {
    title: string;
    numero: string;
    mensagem: string;
    code: string;
  }): Promise<string | null> {
    const r = await fetch("/api/curtos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: dados.title,
        numero: dados.numero,
        mensagem: dados.mensagem || undefined,
        code: dados.code || undefined,
      }),
    });
    const d = await r.json();
    if (!r.ok) return d.erro ?? "Não foi possível criar o link.";
    setCurtos((cs) => [d.curto, ...cs]);
    router.refresh();
    return null;
  }

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Links diretos</h1>
          <p className="mt-1 max-w-[560px] text-sm text-ink-500">
            Um endereço curto que abre a conversa no WhatsApp na hora, sem passar por página
            nenhuma. Serve pro anúncio, pro cartão e pro QR Code da vitrine.
          </p>
        </div>

        <button onClick={() => setModal(true)} className="btn-brand shrink-0" disabled={noLimite}>
          <Plus size={16} /> Criar link direto
        </button>
      </div>

      <p className="mt-3 text-sm text-ink-500">
        {curtos.length}
        {maxCurtos !== null ? ` de ${maxCurtos}` : ""} no plano {nomePlano}
      </p>

      {noLimite && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[14px] border border-brand-200 bg-brand-50 px-4 py-3.5">
          <p className="flex-1 text-sm text-ink-700">
            Você usou {maxCurtos === 1 ? "o link direto" : `os ${maxCurtos} links diretos`} do plano{" "}
            {nomePlano}.
          </p>
          <Link href="/app/planos" className="btn-brand">
            Ver planos
          </Link>
        </div>
      )}

      {erro && <p className="erro mt-3">{erro}</p>}

      {curtos.length === 0 ? (
        <div className="card mt-5 flex flex-col items-center px-5 py-12 text-center">
          <QrCode size={28} className="text-ink-300" />
          <p className="mt-3 max-w-[400px] text-sm text-ink-600">
            Nenhum link direto ainda. Crie o primeiro e você já sai com o QR Code pronto para
            imprimir.
          </p>
          <button onClick={() => setModal(true)} className="btn-brand mt-4">
            <Plus size={16} /> Criar link direto
          </button>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {curtos.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* O QR sai do servidor já desenhado — a tela não carrega
                    biblioteca de QR nenhuma. */}
                <div className="mx-auto w-[116px] shrink-0 rounded-[10px] border border-ink-200 bg-white p-2 sm:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/qrcode?curto=${c.id}&formato=svg`}
                    alt={`QR Code de ${c.title}`}
                    className="w-full"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{c.title}</p>
                    <button
                      onClick={() => alternar(c)}
                      disabled={ocupado === c.id}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        c.active ? "bg-ok-500/10 text-ok-500" : "bg-accent-100 text-warn-500"
                      }`}
                      title={c.active ? "Pausar link" : "Reativar link"}
                    >
                      {ocupado === c.id ? "..." : c.active ? "Ativo" : "Pausado"}
                    </button>
                  </div>

                  <button
                    onClick={() => copiar(c)}
                    className="mt-2 flex max-w-full items-center gap-2 rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-2 text-sm hover:border-brand-300"
                    title="Copiar link"
                  >
                    <span className="min-w-0 truncate font-medium text-brand-600">
                      {urlDe(c).replace(/^https?:\/\//, "")}
                    </span>
                    {copiado === c.id ? (
                      <Check size={14} className="shrink-0 text-ok-500" />
                    ) : (
                      <Copy size={14} className="shrink-0 text-ink-400" />
                    )}
                  </button>

                  <p className="mt-2 text-sm text-ink-500">
                    {formatarTelefone(c.numero)}
                    {c.mensagem ? ` · "${c.mensagem}"` : ""}
                  </p>

                  <p className="mt-1 text-sm">
                    <strong className="text-lg font-bold tracking-tight">{c.clicksTotal}</strong>{" "}
                    <span className="text-ink-500">
                      {c.clicksTotal === 1 ? "clique" : "cliques"}
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`/api/qrcode?curto=${c.id}&formato=png&tamanho=1024`}
                      className="btn-ghost px-3 py-1.5 text-sm"
                      download
                    >
                      <Download size={14} /> Baixar QR
                    </a>
                    <a
                      href={`/w/${c.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost px-3 py-1.5 text-sm"
                    >
                      <ExternalLink size={14} /> Testar
                    </a>
                    <button
                      onClick={() => excluir(c)}
                      className="btn-ghost px-3 py-1.5 text-sm text-ink-500 hover:text-danger-500"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <ModalCurto
          site={site}
          onFechar={() => setModal(false)}
          onCriar={criar}
          onErro={setErro}
        />
      )}
    </div>
  );
}
