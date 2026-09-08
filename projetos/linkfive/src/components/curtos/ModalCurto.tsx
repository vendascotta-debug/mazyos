"use client";

import { useState } from "react";
import { Link2, Loader2, MessageCircle, X } from "lucide-react";
import { normalizarUrl } from "@/lib/curtos";
import {
  MENSAGEM_PADRAO,
  formatarTelefone,
  linkWhatsapp,
  normalizarTelefone,
  telefoneValido,
} from "@/lib/links";

type Tipo = "whatsapp" | "url";

/**
 * Criação de um link direto.
 *
 * A escolha do tipo vem primeiro porque muda o formulário inteiro. WhatsApp
 * aparece primeiro por ser o caso mais comum nesse produto — mas encurtar um
 * link qualquer é um clique de distância, não um recurso escondido.
 *
 * O código é sorteado por padrão. O campo personalizado fica atrás de um botão
 * porque quase ninguém quer escolher — e quem quer, quer muito ("promo-julho"
 * num anúncio impresso).
 */
export function ModalCurto({
  site,
  onFechar,
  onCriar,
  onErro,
}: {
  site: string;
  onFechar: () => void;
  onCriar: (dados: {
    tipo: Tipo;
    title: string;
    numero: string;
    mensagem: string;
    url: string;
    code: string;
  }) => Promise<string | null>;
  onErro: (e: string | null) => void;
}) {
  const [tipo, setTipo] = useState<Tipo>("whatsapp");
  const [title, setTitle] = useState("");
  const [numero, setNumero] = useState("");
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [personalizar, setPersonalizar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dominio = site.replace(/^https?:\/\//, "") || "linkfive.com.br";

  // Destino que o preview mostra — e a mesma checagem que libera o botão.
  const urlNormalizada = tipo === "url" ? normalizarUrl(url) : null;
  const valido = tipo === "whatsapp" ? telefoneValido(numero) : Boolean(urlNormalizada?.ok);
  const destinoPreview =
    tipo === "whatsapp"
      ? linkWhatsapp(numero, mensagem)
      : urlNormalizada?.ok
        ? urlNormalizada.url
        : "";

  async function salvar() {
    setErro(null);
    if (tipo === "whatsapp" && !telefoneValido(numero)) {
      setErro("Digite um número válido com DDD. Ex.: 11 99999-9999");
      return;
    }
    if (tipo === "url") {
      const v = normalizarUrl(url);
      if (!v.ok) {
        setErro(v.erro);
        return;
      }
    }

    setSalvando(true);
    const falha = await onCriar({
      tipo,
      title: title.trim(),
      numero,
      mensagem: mensagem.trim(),
      url,
      code: personalizar ? code.trim() : "",
    });
    setSalvando(false);
    if (falha) setErro(falha);
    else {
      onErro(null);
      onFechar();
    }
  }

  const OPCOES: { id: Tipo; label: string; descricao: string; icone: typeof Link2 }[] = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      descricao: "Abre a conversa direto",
      icone: MessageCircle,
    },
    { id: "url", label: "Link comum", descricao: "Encurta qualquer endereço", icone: Link2 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 sm:items-center sm:p-5"
      onClick={onFechar}
    >
      <div
        className="max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-[18px] bg-white sm:rounded-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-ink-200 px-5 py-4">
          <h2 className="flex-1 font-semibold">Novo link direto</h2>
          <button onClick={onFechar} className="text-ink-400 hover:text-ink-900">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            {OPCOES.map(({ id, label, descricao, icone: Icone }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTipo(id);
                  setErro(null);
                }}
                className={`rounded-[10px] border p-3 text-left transition-colors ${
                  tipo === id
                    ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                    : "border-ink-200 hover:border-brand-300"
                }`}
              >
                <Icone size={17} className={tipo === id ? "text-brand-600" : "text-ink-400"} />
                <p className="mt-1.5 text-sm font-semibold">{label}</p>
                <p className="text-xs text-ink-500">{descricao}</p>
              </button>
            ))}
          </div>

          {tipo === "whatsapp" ? (
            <>
              <div>
                <label className="label" htmlFor="numero">
                  Número do WhatsApp (com DDD)
                </label>
                <input
                  id="numero"
                  className="input"
                  value={numero}
                  autoFocus
                  inputMode="tel"
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="11 99999-9999"
                />
                {numero && !telefoneValido(numero) && (
                  <p className="mt-1 text-xs text-ink-400">Faltam dígitos — inclua o DDD.</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="mensagem">
                  Mensagem que já vem digitada
                </label>
                <textarea
                  id="mensagem"
                  className="input min-h-[74px] resize-y"
                  value={mensagem}
                  maxLength={300}
                  onChange={(e) => setMensagem(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-400">
                  O cliente abre a conversa com ela pronta. Ele só aperta enviar.
                </p>
              </div>
            </>
          ) : (
            <div>
              <label className="label" htmlFor="url">
                Endereço que o link vai abrir
              </label>
              <input
                id="url"
                className="input"
                value={url}
                autoFocus
                inputMode="url"
                onChange={(e) => setUrl(e.target.value)}
                placeholder="meusite.com.br/promocao"
              />
              <p className="mt-1 text-xs text-ink-400">
                Pode colar sem o https — a gente completa.
              </p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="titulo">
              Nome do link (só você vê)
            </label>
            <input
              id="titulo"
              className="input"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Anúncio de julho"
            />
          </div>

          {!personalizar ? (
            <button
              type="button"
              onClick={() => setPersonalizar(true)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Escolher o final do endereço
            </button>
          ) : (
            <div>
              <label className="label" htmlFor="code">
                Final do endereço
              </label>
              <div className="flex items-center rounded-[10px] border border-ink-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <span className="pl-3.5 text-sm text-ink-400">{dominio}/w/</span>
                <input
                  id="code"
                  className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm outline-none"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                  placeholder="promo-julho"
                />
              </div>
              <p className="mt-1 text-xs text-ink-400">
                Deixe em branco para o sistema sortear um código curto.
              </p>
            </div>
          )}

          {valido && (
            <div className="rounded-[10px] bg-ink-50 px-3.5 py-3">
              <p className="text-xs font-medium text-ink-500">Vai levar para</p>
              <p className="mt-1 break-all text-xs text-ink-700">{destinoPreview}</p>
              {tipo === "whatsapp" && (
                <p className="mt-1.5 text-xs text-ink-500">
                  Número: {formatarTelefone(normalizarTelefone(numero))}
                </p>
              )}
            </div>
          )}

          {erro && <p className="erro">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onFechar} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button onClick={salvar} className="btn-brand flex-1" disabled={salvando || !valido}>
              {salvando && <Loader2 size={16} className="animate-spin" />}
              Criar link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
