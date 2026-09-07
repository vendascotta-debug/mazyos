"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { LeadField, PageLink } from "@/lib/types";

/**
 * O bloco de captura na página pública.
 *
 * É o único formulário do produto que um estranho preenche, então ele carrega
 * duas regras que o resto do sistema não tem:
 *
 * 1. Só o que o dono escolheu aparece. Campo a mais é contato a menos —
 *    formulário longo espanta quem estava a um toque de virar cliente.
 * 2. O aviso de privacidade fica visível. Estamos coletando dado de terceiro
 *    em nome do cliente, e a LGPD é do dono da página tanto quanto nossa.
 */
const ROTULOS: Record<LeadField, { label: string; placeholder: string; tipo: string }> = {
  name: { label: "Seu nome", placeholder: "Como podemos te chamar?", tipo: "text" },
  whatsapp: { label: "WhatsApp", placeholder: "(11) 99999-9999", tipo: "tel" },
  email: { label: "E-mail", placeholder: "voce@email.com", tipo: "email" },
  company: { label: "Empresa", placeholder: "Nome da empresa", tipo: "text" },
  message: { label: "Mensagem", placeholder: "Como podemos ajudar?", tipo: "textarea" },
};

const PADRAO: LeadField[] = ["name", "whatsapp"];

export function FormularioLead({ link, slug }: { link: PageLink; slug: string }) {
  const campos = link.config.campos?.length ? link.config.campos : PADRAO;
  const titulo = link.config.formTitulo || link.title || "Quero receber informações";

  const [valores, setValores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, linkId: link.id, ...valores }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível enviar. Tente de novo.");
        return;
      }
      setEnviado(true);
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div
        id="formulario"
        className="flex flex-col items-center gap-2 px-4 py-6 text-center"
        style={{
          background: "var(--lf-cardFundo)",
          border: "1px solid var(--lf-cardBorda)",
          borderRadius: "var(--lf-raio)",
        }}
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: "var(--lf-destaque)", color: "var(--lf-destaqueTexto)" }}
        >
          <Check size={22} />
        </span>
        <p className="font-semibold">Recebemos seu contato.</p>
        <p className="text-sm" style={{ color: "var(--lf-textoSuave)" }}>
          Em breve alguém fala com você.
        </p>
      </div>
    );
  }

  return (
    <form
      id="formulario"
      onSubmit={enviar}
      className="px-4 py-4"
      style={{
        background: "var(--lf-cardFundo)",
        border: "1px solid var(--lf-cardBorda)",
        borderRadius: "var(--lf-raio)",
      }}
    >
      <p className="mb-3 text-center font-semibold">{titulo}</p>

      <div className="flex flex-col gap-2.5">
        {campos.map((campo) => {
          const c = ROTULOS[campo];
          if (!c) return null;
          const comum = {
            id: `lead-${campo}`,
            name: campo,
            required: campo === "name" || campo === "whatsapp",
            placeholder: c.placeholder,
            value: valores[campo] ?? "",
            onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setValores((v) => ({ ...v, [campo]: ev.target.value })),
            className: "w-full rounded-[10px] px-3.5 py-2.5 text-[15px] outline-none",
            style: {
              background: "var(--lf-botaoFundo)",
              color: "var(--lf-botaoTexto)",
              border: "1px solid var(--lf-botaoBorda)",
            },
          };

          return (
            <div key={campo}>
              <label htmlFor={comum.id} className="sr-only">
                {c.label}
              </label>
              {c.tipo === "textarea" ? (
                <textarea {...comum} rows={3} className={`${comum.className} resize-y`} />
              ) : (
                <input {...comum} type={c.tipo} inputMode={campo === "whatsapp" ? "tel" : undefined} />
              )}
            </div>
          );
        })}
      </div>

      {erro && (
        <p className="mt-2 text-center text-sm" style={{ color: "#dc2626" }}>
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-3 flex w-full items-center justify-center gap-2 px-4 py-3 text-[15px] font-semibold transition-transform active:scale-[.99] disabled:opacity-60"
        style={{
          background: "var(--lf-destaque)",
          color: "var(--lf-destaqueTexto)",
          borderRadius: "var(--lf-raio)",
        }}
      >
        {enviando && <Loader2 size={16} className="animate-spin" />}
        {enviando ? "Enviando..." : "Enviar"}
      </button>

      <p className="mt-2.5 text-center text-[11px]" style={{ color: "var(--lf-textoSuave)" }}>
        Seus dados vão apenas para o dono desta página.
      </p>
    </form>
  );
}
