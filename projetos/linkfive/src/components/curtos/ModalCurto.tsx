"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  MENSAGEM_PADRAO,
  formatarTelefone,
  linkWhatsapp,
  normalizarTelefone,
  telefoneValido,
} from "@/lib/links";

/**
 * Criação de um link direto.
 *
 * O código é sorteado por padrão. O campo personalizado fica escondido atrás de
 * um botão porque quase ninguém quer escolher — e quem quer, quer muito
 * ("promo-julho" num anúncio impresso).
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
    title: string;
    numero: string;
    mensagem: string;
    code: string;
  }) => Promise<string | null>;
  onErro: (e: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [numero, setNumero] = useState("");
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [code, setCode] = useState("");
  const [personalizar, setPersonalizar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dominio = site.replace(/^https?:\/\//, "") || "linkfive.com.br";
  const valido = telefoneValido(numero);

  async function salvar() {
    setErro(null);
    if (!valido) {
      setErro("Digite um número válido com DDD. Ex.: 11 97393-3648");
      return;
    }
    setSalvando(true);
    const falha = await onCriar({
      title: title.trim(),
      numero,
      mensagem: mensagem.trim(),
      code: personalizar ? code.trim() : "",
    });
    setSalvando(false);
    if (falha) setErro(falha);
    else {
      onErro(null);
      onFechar();
    }
  }

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
              placeholder="11 97393-3648"
            />
            {numero && !valido && (
              <p className="mt-1 text-xs text-ink-400">Faltam dígitos — inclua o DDD.</p>
            )}
          </div>

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
              <p className="mt-1 break-all text-xs text-ink-700">{linkWhatsapp(numero, mensagem)}</p>
              <p className="mt-1.5 text-xs text-ink-500">
                Número: {formatarTelefone(normalizarTelefone(numero))}
              </p>
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
