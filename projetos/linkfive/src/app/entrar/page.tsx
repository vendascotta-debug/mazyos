"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Analytics } from "@/components/ui/Analytics";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { BotaoGoogle } from "@/components/ui/BotaoGoogle";

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  // Para onde o middleware queria levar antes de exigir login.
  const destinoPretendido = params.get("destino");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  // A volta do Google traz o motivo na URL: ela e uma navegacao de verdade,
  // entao nao ha resposta de fetch onde carregar o recado.
  const MOTIVOS: Record<string, string> = {
    "google-indisponivel": "Entrar com o Google ainda não está disponível. Use e-mail e senha.",
    "google-expirado": "A tentativa demorou demais. Clique de novo em Continuar com o Google.",
    "google-incompleto": "O Google não completou o login. Tente de novo.",
    "google-falhou": "Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.",
  };
  const [erro, setErro] = useState<string | null>(MOTIVOS[params.get("erro") ?? ""] ?? null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível entrar.");
        return;
      }
      // Só respeita o destino se for interno — um `?destino=https://...` viraria
      // redirecionamento aberto, prato cheio pra phishing.
      const destino =
        destinoPretendido && destinoPretendido.startsWith("/") && !destinoPretendido.startsWith("//")
          ? destinoPretendido
          : (d.destino ?? "/app");
      router.push(destino);
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card w-full max-w-[400px] p-7">
      <h1 className="text-xl font-bold tracking-tight">Entrar</h1>
      <p className="mt-1 text-sm text-ink-500">Acesse sua página e seus resultados.</p>

      <div className="mt-6 flex flex-col gap-4">
        <BotaoGoogle destino={destinoPretendido} />
      </div>

      <form onSubmit={enviar} className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <CampoSenha
          id="senha"
          rotulo="Senha"
          valor={senha}
          aoMudar={setSenha}
          autoComplete="current-password"
          /* Fica junto do campo, e nao perdido no rodape: quem procura esse
             link ja errou a senha e esta olhando exatamente para ca. */
          acessorio={
            <Link
              href="/recuperar"
              className="text-[13px] font-medium text-brand-600 hover:underline"
            >
              Esqueci minha senha
            </Link>
          }
        />

        {erro && <p className="erro">{erro}</p>}

        <button type="submit" className="btn-brand w-full" disabled={enviando}>
          {enviando ? <Loader2 size={16} className="animate-spin" /> : null}
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-500">
        Não tem conta?{" "}
        <Link href="/cadastrar" className="font-medium text-brand-600 hover:underline">
          Criar grátis
        </Link>
      </p>
    </div>
  );
}

export default function Entrar() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-5 py-10">
      <Analytics />
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      {/* useSearchParams exige Suspense no App Router. */}
      <Suspense fallback={<div className="card h-[380px] w-full max-w-[400px] animate-pulse" />}>
        <Formulario />
      </Suspense>
    </main>
  );
}
