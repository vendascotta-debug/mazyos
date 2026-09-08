import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export const metadata = {
  title: "Link protegido — LINKFIVE",
  // Link com senha não deve aparecer em busca: metade da proteção é ninguém
  // saber que ele existe.
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ erro?: string }>;
};

/**
 * A tela de senha do link protegido.
 *
 * Formulário HTML puro, sem JavaScript: ele envia direto para o POST da rota
 * `/w/[codigo]`, que confere e redireciona na mesma requisição. Nada de API
 * devolvendo o destino em JSON — isso entregaria o link protegido a quem
 * soubesse chamar a rota.
 */
export default async function TelaSenha({ params, searchParams }: Props) {
  const { codigo } = await params;
  const { erro } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-5 py-10">
      <Link href="/" className="mb-8 text-white">
        <Logo mono />
      </Link>

      <div className="card w-full max-w-[400px] p-7 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <Lock size={22} className="text-brand-600" />
        </span>

        <h1 className="mt-4 text-xl font-bold tracking-tight">Este link é protegido</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Digite a senha que quem te enviou o link passou.
        </p>

        <form method="POST" action={`/w/${encodeURIComponent(codigo)}`} className="mt-6">
          <label htmlFor="senha" className="sr-only">
            Senha do link
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            className="input-grande text-center"
            placeholder="Senha"
            autoFocus
            required
            autoComplete="off"
          />

          {erro && <p className="erro">Senha incorreta. Tente de novo.</p>}

          <button type="submit" className="btn-brand mt-4 w-full py-3 text-[15px]">
            Abrir link
          </button>
        </form>

        <p className="mt-5 text-xs text-ink-400">
          Não sabe a senha? Peça para quem compartilhou o link com você.
        </p>
      </div>
    </main>
  );
}
