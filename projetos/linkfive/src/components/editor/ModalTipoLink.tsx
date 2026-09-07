"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import type { LeadField, LinkConfig, LinkType } from "@/lib/types";
import {
  MENSAGEM_PADRAO,
  ORDEM_TIPOS,
  TIPOS,
  formatarTelefone,
  linkWhatsapp,
  normalizarTelefone,
  telefoneValido,
} from "@/lib/links";

/**
 * Escolha do tipo e preenchimento do link, em duas etapas.
 *
 * Duas etapas em vez de um formulário só porque cada tipo pede campos
 * diferentes — um formulário genérico com "cole a URL" jogaria pro usuário o
 * trabalho de montar link de WhatsApp na mão, que é justamente o que o produto
 * promete resolver.
 */
/** Campos possíveis do formulário. Nome e WhatsApp são fixos: sem contato o
 *  lead não serve para nada. */
const CAMPOS_LEAD: { id: LeadField; label: string; fixo?: boolean }[] = [
  { id: "name", label: "Nome", fixo: true },
  { id: "whatsapp", label: "WhatsApp", fixo: true },
  { id: "email", label: "E-mail" },
  { id: "company", label: "Empresa" },
  { id: "message", label: "Mensagem" },
];

export function ModalTipoLink({
  onFechar,
  onCriar,
}: {
  onFechar: () => void;
  onCriar: (tipo: LinkType, titulo: string, entrada: string, config: LinkConfig) => Promise<boolean>;
  podeTema?: boolean;
}) {
  const [tipo, setTipo] = useState<LinkType | null>(null);
  const [titulo, setTitulo] = useState("");
  const [entrada, setEntrada] = useState("");
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Nome e WhatsApp por padrão: é o mínimo pra conseguir responder alguém.
  const [campos, setCampos] = useState<LeadField[]>(["name", "whatsapp"]);

  function escolher(t: LinkType) {
    setTipo(t);
    setTitulo(TIPOS[t].label);
    setEntrada("");
    setErro(null);
  }

  const ehWhats = tipo === "whatsapp";
  const ehForm = tipo === "form";

  async function salvar() {
    if (!tipo) return;
    setErro(null);

    if (ehWhats && !telefoneValido(entrada)) {
      setErro("Digite um número válido com DDD. Ex.: 11 97393-3648");
      return;
    }
    if (!ehWhats && !ehForm && !entrada.trim()) {
      setErro("Preencha o endereço do link.");
      return;
    }

    setSalvando(true);
    const config: LinkConfig = ehWhats
      ? { numero: normalizarTelefone(entrada), mensagem: mensagem.trim() || undefined }
      : ehForm
        ? { campos, formTitulo: titulo.trim() || undefined }
        : {};
    const ok = await onCriar(tipo, titulo.trim() || TIPOS[tipo].label, entrada, config);
    setSalvando(false);
    if (ok) onFechar();
    else setErro("Não foi possível criar o link.");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-5"
      onClick={onFechar}
    >
      <div
        className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-t-[18px] bg-white sm:rounded-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-ink-200 px-5 py-4">
          {tipo && (
            <button onClick={() => setTipo(null)} className="text-ink-400 hover:text-ink-900">
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="flex-1 font-semibold">
            {tipo ? TIPOS[tipo].label : "O que você quer adicionar?"}
          </h2>
          <button onClick={onFechar} className="text-ink-400 hover:text-ink-900">
            <X size={18} />
          </button>
        </header>

        {!tipo ? (
          <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3">
            {ORDEM_TIPOS.map((t) => (
              <button
                key={t}
                onClick={() => escolher(t)}
                className="flex flex-col items-start gap-2 rounded-[10px] border border-ink-200 p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: TIPOS[t].cor }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium leading-tight">{TIPOS[t].label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div>
              <label className="label" htmlFor="titulo-link">
                Texto do botão
              </label>
              <input
                id="titulo-link"
                className="input"
                value={titulo}
                maxLength={40}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={TIPOS[tipo].label}
              />
            </div>

            {!ehForm && (
              <div>
                <label className="label" htmlFor="entrada">
                  {ehWhats ? "Número do WhatsApp (com DDD)" : "Endereço"}
                </label>
                <input
                  id="entrada"
                  className="input"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder={TIPOS[tipo].placeholder}
                  inputMode={ehWhats ? "tel" : "text"}
                />
              </div>
            )}

            {ehWhats && (
              <>
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
                    O cliente abre a conversa com essa mensagem pronta. Ele só aperta enviar.
                  </p>
                </div>

                {telefoneValido(entrada) && (
                  <div className="rounded-[10px] bg-ink-50 px-3.5 py-3">
                    <p className="text-xs font-medium text-ink-500">Link gerado</p>
                    <p className="mt-1 break-all text-xs text-ink-700">
                      {linkWhatsapp(entrada, mensagem)}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-500">
                      Número: {formatarTelefone(normalizarTelefone(entrada))}
                    </p>
                  </div>
                )}
              </>
            )}

            {ehForm && (
              <>
                <div>
                  <span className="label">Campos que o visitante preenche</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CAMPOS_LEAD.map(({ id, label, fixo }) => {
                      const marcado = campos.includes(id);
                      return (
                        <label
                          key={id}
                          className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-sm ${
                            marcado ? "border-brand-500 bg-brand-50" : "border-ink-200"
                          } ${fixo ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={marcado}
                            disabled={fixo}
                            onChange={(e) =>
                              setCampos((cs) =>
                                e.target.checked ? [...cs, id] : cs.filter((c) => c !== id),
                              )
                            }
                            className="accent-brand-500"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-ink-400">
                    Menos campos, mais contatos. Cada pergunta a mais faz alguém desistir.
                  </p>
                </div>

                <p className="rounded-[10px] bg-brand-50 px-3.5 py-3 text-sm text-ink-700">
                  Os contatos recebidos aparecem na aba Leads.
                </p>
              </>
            )}

            {erro && <p className="erro">{erro}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onFechar} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button onClick={salvar} className="btn-brand flex-1" disabled={salvando}>
                {salvando && <Loader2 size={16} className="animate-spin" />}
                Adicionar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
