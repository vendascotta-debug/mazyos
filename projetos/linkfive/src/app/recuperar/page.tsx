"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

/**
 * "Esqueci minha senha" — o pedido.
 *
 * A tela de sucesso não confirma se a conta existe, e o texto foi escrito para
 * isso: "se existir uma conta com esse e-mail". Dizer "enviamos para você"
 * entregaria, a quem estivesse sondando, quais e-mails têm conta aqui.
 *
 * O e-mail digitado aparece na confirmação porque o erro mais comum não é
 * inventar uma conta — é digitar o endereço errado e ficar esperando uma
 * mensagem que nunca vai chegar.
 */
export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível enviar agora.");
        return;
      }
      setPronto(true);
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-5 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>

      <div className="card w-full max-w-[400px] p-7">
        {pronto ? (
          <>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <MailCheck size={20} />
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight">Verifique seu e-mail</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Se existir uma conta com <strong className="text-ink-900">{email}</strong>, o link
              para criar uma senha nova já está a caminho. Ele vale por 30 minutos.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
              Não chegou em alguns minutos? Confira o spam e se o endereço está escrito certo.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/entrar" className="btn-brand">
                Voltar para o login
              </Link>
              <button onClick={() => setPronto(false)} className="btn-ghost">
                Usar outro e-mail
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight">Esqueci minha senha</h1>
            <p className="mt-1 text-sm text-ink-500">
              Digite seu e-mail e mandamos um link para criar uma senha nova.
            </p>

            <form onSubmit={enviar} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  E-mail da conta
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {erro && <p className="erro">{erro}</p>}

              <button type="submit" className="btn-brand w-full" disabled={enviando}>
                {enviando ? <Loader2 size={16} className="animate-spin" /> : null}
                {enviando ? "Enviando..." : "Enviar link"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-500">
              Lembrou?{" "}
              <Link href="/entrar" className="font-medium text-brand-600 hover:underline">
                Entrar
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
