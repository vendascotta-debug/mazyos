import Link from "next/link";
import { CalendarX } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export const metadata = {
  title: "Link expirado — LINKFIVE",
  robots: { index: false, follow: false },
};

/**
 * O que o visitante vê quando o link já passou da validade.
 *
 * Poderia ser um 404, mas quem chegou aqui geralmente veio de um cartão ou de
 * um QR impresso — e "não encontrado" faria a pessoa achar que digitou errado
 * e tentar de novo. Dizer que a oferta acabou encerra o assunto, e o convite
 * no rodapé transforma a decepção numa chance de cadastro.
 */
export default function Aviso() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-5 py-10">
      <Link href="/" className="mb-8 text-white">
        <Logo mono />
      </Link>

      <div className="card w-full max-w-[420px] p-7 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-100">
          <CalendarX size={22} className="text-brand-600" />
        </span>

        <h1 className="mt-4 text-xl font-bold tracking-tight">Esse link expirou</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          Quem criou este link definiu uma data de validade, e ela já passou. Se você veio de um
          anúncio ou de um material impresso, procure a empresa por outro canal.
        </p>

        <div className="mt-6 rounded-[12px] bg-ink-50 p-4">
          <p className="text-sm font-medium text-ink-800">Você também cria links assim</p>
          <p className="mt-1 text-sm text-ink-500">
            Com data para expirar, senha e contador de cliques. Grátis para começar.
          </p>
          <Link href="/" className="btn-brand mt-3 w-full py-2.5 text-[15px]">
            Conhecer o LINKFIVE
          </Link>
        </div>
      </div>
    </main>
  );
}
