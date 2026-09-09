"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Analytics } from "@/components/ui/Analytics";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { BotaoGoogle } from "@/components/ui/BotaoGoogle";
import { normalizarSlug } from "@/lib/slug";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? "linkfive.com.br";

type EstadoSlug =
  | { fase: "vazio" }
  | { fase: "checando" }
  | { fase: "livre" }
  | { fase: "ocupado"; erro: string; sugestoes: string[] };

export default function Cadastrar() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [estado, setEstado] = useState<EstadoSlug>({ fase: "vazio" });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Enquanto o usuário não mexeu no endereço, ele acompanha o nome digitado —
  // é o que a maioria quer, e economiza um campo de decisão no cadastro.
  useEffect(() => {
    if (!slugEditado) setSlug(normalizarSlug(nome));
  }, [nome, slugEditado]);

  // Checagem de disponibilidade com atraso: sem isso, cada tecla vira uma
  // consulta ao banco.
  useEffect(() => {
    if (!slug) return setEstado({ fase: "vazio" });
    setEstado({ fase: "checando" });
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/slug/disponivel?slug=${encodeURIComponent(slug)}`);
        const d = await r.json();
        setEstado(
          d.disponivel
            ? { fase: "livre" }
            : { fase: "ocupado", erro: d.erro ?? "Indisponível.", sugestoes: d.sugestoes ?? [] },
        );
      } catch {
        setEstado({ fase: "vazio" });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, email, senha, slug }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível criar a conta.");
        return;
      }
      router.push(d.destino ?? "/onboarding");
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-5 py-10">
      <Analytics />
      <Link href="/" className="mb-8">
        <Logo />
      </Link>

      <div className="card w-full max-w-[420px] p-7">
        <h1 className="text-xl font-bold tracking-tight">Criar minha página</h1>
        <p className="mt-1 text-sm text-ink-500">É grátis. Leva menos de um minuto.</p>

        <div className="mt-6 flex flex-col gap-4">
          <BotaoGoogle />
        </div>

        <form onSubmit={enviar} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="nome">
              Nome ou nome do negócio
            </label>
            <input
              id="nome"
              className="input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Oficina do Carlos"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label className="label" htmlFor="slug">
              Endereço da sua página
            </label>
            <div className="flex items-center rounded-[10px] border border-ink-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
              <span className="pl-3.5 text-sm text-ink-400">{SITE}/</span>
              <input
                id="slug"
                className="min-w-0 flex-1 bg-transparent py-2.5 pr-2 text-sm outline-none"
                value={slug}
                onChange={(e) => {
                  setSlugEditado(true);
                  setSlug(normalizarSlug(e.target.value));
                }}
                placeholder="oficinadocarlos"
                required
              />
              <span className="pr-3">
                {estado.fase === "checando" && (
                  <Loader2 size={16} className="animate-spin text-ink-400" />
                )}
                {estado.fase === "livre" && <Check size={16} className="text-ok-500" />}
                {estado.fase === "ocupado" && <X size={16} className="text-danger-500" />}
              </span>
            </div>

            {estado.fase === "ocupado" && (
              <div className="erro">
                {estado.erro}
                {estado.sugestoes.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {estado.sugestoes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSlugEditado(true);
                          setSlug(s);
                        }}
                        className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700 hover:border-brand-300 hover:text-brand-600"
                      >
                        {s}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            )}
          </div>

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
              placeholder="voce@email.com"
              required
              autoComplete="email"
            />
          </div>

          <CampoSenha
            id="senha"
            rotulo="Senha"
            valor={senha}
            aoMudar={setSenha}
            autoComplete="new-password"
            minLength={8}
            ajuda="Pelo menos 8 caracteres."
          />

          {erro && <p className="erro">{erro}</p>}

          <button
            type="submit"
            className="btn-brand w-full"
            disabled={enviando || estado.fase === "ocupado" || estado.fase === "checando"}
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : null}
            {enviando ? "Criando..." : "Criar minha página grátis"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-500">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
