"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Loader2, Lock, Target, X } from "lucide-react";
import type { ShortLink } from "@/lib/curtos";
import { normalizarUrl } from "@/lib/curtos";
import { formatarTelefone, normalizarTelefone, telefoneValido } from "@/lib/links";

/**
 * Onde o dono muda o que o link faz depois de criado.
 *
 * O código do link nunca aparece aqui como editável, e é de propósito: o
 * endereço já está impresso em cartão e vitrine. O que muda é para onde ele
 * leva, até quando vale e se pede senha — tudo sem invalidar o que já foi
 * distribuído. É justamente esse o valor do recurso.
 */
export function ModalEditarCurto({
  curto,
  podeGerir,
  onFechar,
  onSalvo,
}: {
  curto: ShortLink;
  podeGerir: boolean;
  onFechar: () => void;
  onSalvo: (atualizado: ShortLink) => void;
}) {
  const [title, setTitle] = useState(curto.title);
  const [numero, setNumero] = useState(
    curto.numero ? formatarTelefone(curto.numero).replace("+55 ", "") : "",
  );
  const [mensagem, setMensagem] = useState(curto.mensagem ?? "");
  const [url, setUrl] = useState(curto.tipo === "url" ? curto.destino : "");
  // O input type=date quer AAAA-MM-DD; o banco guarda ISO completo.
  const [expiraEm, setExpiraEm] = useState(curto.expiraEm ? curto.expiraEm.slice(0, 10) : "");
  const [mexerNaSenha, setMexerNaSenha] = useState(false);
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ehWhats = curto.tipo === "whatsapp";
  const hoje = new Date().toISOString().slice(0, 10);

  async function salvar() {
    setErro(null);

    if (ehWhats && numero && !telefoneValido(numero)) {
      setErro("Número inválido. Informe com DDD.");
      return;
    }
    if (!ehWhats && url && !normalizarUrl(url).ok) {
      setErro("Endereço inválido. Confira se está completo.");
      return;
    }

    setSalvando(true);
    try {
      const corpo: Record<string, unknown> = { title };

      if (podeGerir) {
        if (ehWhats) {
          corpo.numero = normalizarTelefone(numero);
          corpo.mensagem = mensagem || null;
        } else {
          corpo.url = url;
        }
        // Só manda a expiração se ela mudou — assim um salvamento de título
        // não reseta a data sem querer.
        const atual = curto.expiraEm ? curto.expiraEm.slice(0, 10) : "";
        if (expiraEm !== atual) corpo.expiraEm = expiraEm || null;
        if (mexerNaSenha) corpo.senha = senha || null;
      }

      const r = await fetch(`/api/curtos/${curto.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível salvar.");
        return;
      }
      onSalvo(d.curto);
      onFechar();
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setSalvando(false);
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
          <h2 className="flex-1 font-semibold">Editar link</h2>
          <button onClick={onFechar} className="text-ink-400 hover:text-ink-900">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="rounded-[10px] bg-ink-50 px-3.5 py-2.5">
            <p className="text-xs font-medium text-ink-500">Endereço (não muda)</p>
            <p className="mt-0.5 text-sm font-medium text-brand-600">/w/{curto.code}</p>
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
            />
          </div>

          {!podeGerir && (
            <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-brand-200 bg-brand-50 px-3.5 py-3">
              <p className="flex-1 text-sm text-ink-700">
                Trocar o destino, definir validade e proteger com senha entram no plano Starter.
              </p>
              <Link href="/app/planos" className="btn-brand px-3 py-1.5 text-sm">
                Ver planos
              </Link>
            </div>
          )}

          <fieldset disabled={!podeGerir} className="space-y-4 disabled:opacity-50">
            {/* --- Destino --- */}
            <div>
              <span className="label flex items-center gap-1.5">
                <Target size={14} /> Para onde leva
              </span>
              {ehWhats ? (
                <>
                  <input
                    className="input"
                    value={numero}
                    inputMode="tel"
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="11 99999-9999"
                  />
                  <textarea
                    className="input mt-2 min-h-[62px] resize-y text-sm"
                    value={mensagem}
                    maxLength={300}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Mensagem que já vem digitada"
                  />
                </>
              ) : (
                <input
                  className="input"
                  value={url}
                  inputMode="url"
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="meusite.com.br/promocao"
                />
              )}
              <p className="mt-1 text-xs text-ink-400">
                O endereço curto continua o mesmo — o QR já impresso segue funcionando.
              </p>
            </div>

            {/* --- Expiração --- */}
            <div>
              <label className="label flex items-center gap-1.5" htmlFor="expira">
                <CalendarClock size={14} /> Válido até
              </label>
              <div className="flex gap-2">
                <input
                  id="expira"
                  type="date"
                  className="input"
                  value={expiraEm}
                  min={hoje}
                  onChange={(e) => setExpiraEm(e.target.value)}
                />
                {expiraEm && (
                  <button
                    type="button"
                    onClick={() => setExpiraEm("")}
                    className="btn-ghost shrink-0"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-400">
                {expiraEm
                  ? "Depois dessa data o link avisa que a oferta acabou, em vez de dar erro."
                  : "Em branco, o link vale para sempre."}
              </p>
            </div>

            {/* --- Senha --- */}
            <div>
              <span className="label flex items-center gap-1.5">
                <Lock size={14} /> Senha
              </span>

              {!mexerNaSenha ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink-600">
                    {curto.temSenha ? "Este link pede senha." : "Este link é aberto."}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMexerNaSenha(true)}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    {curto.temSenha ? "Trocar ou remover" : "Proteger com senha"}
                  </button>
                </div>
              ) : (
                <>
                  <input
                    className="input"
                    type="text"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Nova senha (mínimo 4 caracteres)"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs text-ink-400">
                    Deixe em branco e salve para <strong>remover</strong> a senha. Anote-a: ela é
                    guardada embaralhada e não temos como recuperá-la depois.
                  </p>
                </>
              )}
            </div>
          </fieldset>

          {erro && <p className="erro">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onFechar} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button onClick={salvar} className="btn-brand flex-1" disabled={salvando}>
              {salvando && <Loader2 size={16} className="animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
