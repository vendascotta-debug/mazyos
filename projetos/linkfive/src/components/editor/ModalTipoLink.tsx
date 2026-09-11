"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { ArrowLeft, FileText, Loader2, Upload, X } from "lucide-react";
import type { LeadField, LinkConfig, LinkType, PageLink } from "@/lib/types";
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
/** Dez megabytes, o mesmo teto que o servidor assina. */
const LIMITE_PDF = 10 * 1024 * 1024;

const CAMPOS_LEAD: { id: LeadField; label: string; fixo?: boolean }[] = [
  { id: "name", label: "Nome", fixo: true },
  { id: "whatsapp", label: "WhatsApp", fixo: true },
  { id: "email", label: "E-mail" },
  { id: "company", label: "Empresa" },
  { id: "message", label: "Mensagem" },
];

/**
 * Reconstrói o que a pessoa digitou, a partir do que foi guardado.
 *
 * O banco guarda a URL pronta (`https://instagram.com/perfil`), porque o
 * redirecionamento não pode depender de remontar nada a cada clique. Para
 * editar, é preciso o caminho de volta — senão o campo abriria vazio e a
 * pessoa teria de digitar tudo outra vez, que é exatamente o que ela já fazia
 * excluindo e recriando.
 */
function entradaDoLink(link: PageLink): string {
  if (link.type === "whatsapp") return link.config.numero ?? "";
  if (link.type === "form") return "";
  if (link.type === "phone") return link.url.replace(/^tel:\+?/, "");
  if (link.type === "email") return link.url.replace(/^mailto:/, "");
  // Os demais aceitam a URL inteira de volta: `montarUrl` devolve igual
  // quando já vem com http.
  return link.url;
}

export function ModalTipoLink({
  onFechar,
  onCriar,
  link,
  podePdf = false,
}: {
  onFechar: () => void;
  onCriar: (tipo: LinkType, titulo: string, entrada: string, config: LinkConfig) => Promise<boolean>;
  /** Quando vem preenchido, o modal edita em vez de criar. */
  link?: PageLink | null;
  podeTema?: boolean;
  /** O plano permite hospedar o PDF do catálogo aqui. */
  podePdf?: boolean;
}) {
  const editando = Boolean(link);

  // O tipo já vem escolhido na edição, e não muda: trocar o tipo de um link
  // existente mudaria o significado do endereço guardado. Quem quer outro tipo
  // cria outro botão.
  const [tipo, setTipo] = useState<LinkType | null>(link?.type ?? null);
  const [titulo, setTitulo] = useState(link?.title ?? "");
  const [entrada, setEntrada] = useState(link ? entradaDoLink(link) : "");
  const [mensagem, setMensagem] = useState(link?.config.mensagem ?? MENSAGEM_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Nome e WhatsApp por padrão: é o mínimo pra conseguir responder alguém.
  const [campos, setCampos] = useState<LeadField[]>(link?.config.campos ?? ["name", "whatsapp"]);

  function escolher(t: LinkType) {
    setTipo(t);
    setTitulo(TIPOS[t].label);
    setEntrada("");
    setErro(null);
  }

  const ehWhats = tipo === "whatsapp";
  const ehForm = tipo === "form";
  const ehCatalogo = tipo === "catalog";
  const [enviando, setEnviando] = useState(false);

  /**
   * Envia o PDF e usa o endereço devolvido como destino do botão.
   *
   * O catálogo é o caso em que "cole o endereço" mais falha: o arquivo está no
   * celular ou no computador da pessoa, não publicado em lugar nenhum. Quem
   * tiver catálogo grande demais continua podendo apontar pra um endereço de
   * fora — por isso o campo de endereço não sai da tela.
   */
  async function enviarPdf(arquivo: File) {
    setErro(null);

    // Confere o tamanho ANTES de subir: o servidor também recusa, mas aí o
    // usuário teria esperado o arquivo inteiro atravessar a internet pra
    // descobrir. E é o erro mais comum — catálogo costuma ser pesado.
    if (arquivo.size > LIMITE_PDF) {
      const mb = (arquivo.size / 1024 / 1024).toFixed(1);
      setErro(
        `Esse catálogo tem ${mb} MB e o limite é 10 MB. Comprima o PDF no link acima e envie de novo.`,
      );
      return;
    }

    setEnviando(true);
    try {
      // Vai do navegador direto pro armazenamento. Passar pelo nosso servidor
      // não funciona: a Vercel recusa requisição acima de ~4,5 MB antes do
      // código rodar, e o usuário recebia um erro genérico sem saber por quê.
      const enviado = await upload(`catalogos/${Date.now()}.pdf`, arquivo, {
        access: "public",
        contentType: "application/pdf",
        handleUploadUrl: "/api/upload/catalogo",
      });
      setEntrada(enviado.url);
      if (!titulo.trim()) setTitulo("Catálogo");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o catálogo.");
    } finally {
      setEnviando(false);
    }
  }

  async function salvar() {
    if (!tipo) return;
    setErro(null);

    if (ehWhats && !telefoneValido(entrada)) {
      setErro("Digite um número válido com DDD. Ex.: 11 99999-9999");
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
    else setErro(editando ? "Não foi possível salvar." : "Não foi possível criar o link.");
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
          {/* Na edição não há para onde voltar: o tipo está fixo. */}
          {tipo && !editando && (
            <button onClick={() => setTipo(null)} className="text-ink-400 hover:text-ink-900">
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="flex-1 font-semibold">
            {editando
              ? `Editar ${TIPOS[link!.type].label}`
              : tipo
                ? TIPOS[tipo].label
                : "O que você quer adicionar?"}
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
              {/* O contador existe porque o corte era silencioso: a pessoa
                  digitava e as letras simplesmente paravam de aparecer. E o
                  aviso dos 28 vem antes do limite porque o botao trunca com
                  reticencias muito antes dos 40 — em celular estreito, texto
                  longo vira "Comunidade Vip de ofertas Pa…". */}
              <p
                className={`mt-1 text-xs ${
                  titulo.length > 28 ? "text-warn-500" : "text-ink-400"
                }`}
              >
                {titulo.length}/40
                {titulo.length > 28 && " · textos longos ficam cortados no botão"}
              </p>
            </div>

            {ehCatalogo && podePdf && (
              <div>
                <label className="label">Arquivo do catálogo</label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-[14px] border border-dashed px-4 py-4 transition-colors ${
                    enviando ? "border-ink-200 opacity-60" : "border-ink-300 hover:border-brand-500"
                  }`}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={enviando}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      // Limpa o campo pra reenviar o mesmo arquivo depois de um erro.
                      e.target.value = "";
                      if (f) enviarPdf(f);
                    }}
                  />
                  {enviando ? (
                    <Loader2 size={20} className="animate-spin text-ink-500" />
                  ) : entrada.includes("/catalogos/") ? (
                    <FileText size={20} className="text-ok-500" />
                  ) : (
                    <Upload size={20} className="text-ink-500" />
                  )}
                  <span className="text-sm text-ink-700">
                    {enviando
                      ? "Enviando o catálogo…"
                      : entrada.includes("/catalogos/")
                        ? "Catálogo enviado — toque para trocar o arquivo"
                        : "Enviar o PDF do catálogo (até 10 MB)"}
                  </span>
                </label>
                <p className="mt-1.5 text-xs text-ink-600">
                  Maior que 10 MB?{" "}
                  <a
                    href="https://www.ilovepdf.com/pt/comprimir_pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-600 underline"
                  >
                    Comprima o PDF aqui
                  </a>{" "}
                  — é gratuito e não precisa instalar nada. Um catálogo de 30 MB costuma cair
                  para 5 MB.
                </p>
              </div>
            )}

            {!ehForm && (
              <div>
                <label className="label" htmlFor="entrada">
                  {ehWhats
                    ? "Número do WhatsApp (com DDD)"
                    : ehCatalogo && podePdf
                      ? "Ou o endereço de um catálogo já publicado"
                      : "Endereço"}
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
                {editando ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
