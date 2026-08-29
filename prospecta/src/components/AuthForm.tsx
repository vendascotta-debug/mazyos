"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function AuthForm({ modo }: { modo: "login" | "cadastro" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/auth/${modo === "login" ? "login" : "cadastro"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, senha, nome: nome || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível continuar.");
        return;
      }
      // O cookie de sessão já veio na resposta.
      router.push("/buscar");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      {modo === "cadastro" && (
        <div>
          <label className="label" htmlFor="nome">Seu nome</label>
          <input
            id="nome"
            className="input"
            value={nome}
            autoComplete="name"
            placeholder="Alessandro"
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          required
          className="input"
          value={email}
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <div className="relative">
          <input
            id="senha"
            type={verSenha ? "text" : "password"}
            required
            minLength={8}
            className="input pr-10"
            value={senha}
            autoComplete={modo === "login" ? "current-password" : "new-password"}
            placeholder={modo === "cadastro" ? "mínimo 8 caracteres" : ""}
            onChange={(e) => setSenha(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
            title={verSenha ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-400 transition-colors hover:text-ink-700"
          >
            {verSenha ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <button className="btn-brand w-full" disabled={enviando}>
        {enviando && <Loader2 size={15} className="animate-spin" />}
        {modo === "login" ? "Entrar" : "Criar conta e entrar"}
      </button>
    </form>
  );
}
