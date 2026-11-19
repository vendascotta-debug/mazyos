"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const TIPOS = [
  { v: "remocao", l: "Não quero meu nome exibido (remoção)" },
  { v: "acesso", l: "Quero saber quais dados meus vocês têm (acesso)" },
  { v: "correcao", l: "Algum dado meu está errado (correção)" },
  { v: "outro", l: "Outro pedido" },
] as const;

export function PedidoPrivacidade() {
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["v"]>("remocao");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<{ protocolo: string; suprimido: boolean } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/privacidade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo, nome, email, cnpj: cnpj || null, mensagem: mensagem || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar.");
      setOk({ protocolo: data.protocolo, suprimido: data.suprimido });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <div className="card space-y-2 p-5">
        <p className="flex items-center gap-2 font-medium text-ink-900">
          <CheckCircle2 size={18} className="text-emerald-600" /> Pedido recebido
        </p>
        <p className="text-sm text-ink-700">
          {ok.suprimido
            ? "Seu nome deixou de ser exibido no Prospecta. Pode levar alguns minutos para sumir de todas as telas."
            : "Vamos responder pelo e-mail informado em até 15 dias."}
        </p>
        <p className="text-xs text-ink-500">Protocolo: {ok.protocolo}</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="p-tipo">O que você quer?</label>
        <select id="p-tipo" className="input" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="p-nome">Nome completo (como está na Receita) *</label>
        <input id="p-nome" className="input" required minLength={3} value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p-email">E-mail para resposta *</label>
        <input id="p-email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p-cnpj">CNPJ da empresa (opcional)</label>
        <input id="p-cnpj" className="input" placeholder="deixe em branco para remover de todas" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p-msg">Detalhes (opcional)</label>
        <textarea id="p-msg" className="input min-h-20" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
      </div>
      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      <button className="btn-brand w-full" disabled={enviando}>
        {enviando && <Loader2 size={15} className="animate-spin" />} Enviar pedido
      </button>
    </form>
  );
}
