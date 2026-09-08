"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

/**
 * "Esqueci minha senha" — escolher a senha nova.
 *
 * O link é conferido assim que a tela abre, e não só no envio. Sem isso, o
 * cliente digitaria a senha duas vezes para só então descobrir que o link
 * venceu — e ele já está aqui porque alguma coisa deu errado antes.
 */
function Formulario() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [conferindo, setConferindo] = useState(true);
  const [valido, setValido] = useState(false);
  const [senha, setSenha] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) {
      setConferindo(false);
      return;
    }
    fetch(`/api/auth/redefinir?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setValido(Boolean(d.valido)))
      .catch(() => setValido(false))
      .finally(() => setConferindo(false));
  }, [token]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    // Confere aqui também, e não só no servidor: errar a repetição é o engano
    // mais comum, e não vale gastar o link do e-mail por causa dele.
    if (senha !== repetida) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setEnviando(true);
    try {
      const r = await fetch("/api/auth/redefinir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível trocar a senha.");
        return;
      }
      router.push(d.destino ?? "/app");
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (conferindo) {
    return <div className="card h-[320px] w-full max-w-[400px] animate-pulse" />;
  }

  if (!valido) {
    return (
      <div className="card w-full max-w-[400px] p-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-500/10 text-danger-500">
          <ShieldAlert size={20} />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight">Esse link não vale mais</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Links de redefinição valem por 30 minutos e só podem ser usados uma vez. Peça um novo —
          leva alguns segundos.
        </p>
        <Link href="/recuperar" className="btn-brand mt-6 w-full justify-center">
          Pedir um link novo
        </Link>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-[400px] p-7">
      <h1 className="text-xl font-bold tracking-tight">Criar senha nova</h1>
      <p className="mt-1 text-sm text-ink-500">
        Depois de salvar, você entra direto — e quem estiver logado na sua conta em outro aparelho
        cai fora.
      </p>

      <form onSubmit={enviar} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="senha">
            Senha nova
          </label>
          <input
            id="senha"
            type="password"
            className="input"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
          />
          <p className="mt-1 text-[12px] text-ink-400">Pelo menos 8 caracteres.</p>
        </div>

        <div>
          <label className="label" htmlFor="repetida">
            Repita a senha
          </label>
          <input
            id="repetida"
            type="password"
            className="input"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {erro && <p className="erro">{erro}</p>}

        <button type="submit" className="btn-brand w-full" disabled={enviando}>
          {enviando ? <Loader2 size={16} className="animate-spin" /> : null}
          {enviando ? "Salvando..." : "Salvar e entrar"}
        </button>
      </form>
    </div>
  );
}

export default function Redefinir() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-5 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      {/* useSearchParams exige Suspense no App Router. */}
      <Suspense fallback={<div className="card h-[320px] w-full max-w-[400px] animate-pulse" />}>
        <Formulario />
      </Suspense>
    </main>
  );
}
