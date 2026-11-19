import Link from "next/link";
import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { PedidoPrivacidade } from "@/components/PedidoPrivacidade";
import { CONTROLADOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Remover meus dados — Prospecta",
};

export default function RemoverPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-ink-950 px-4 py-4">
        <Link href="/" className="mx-auto flex max-w-xl items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500">
            <Radar size={18} className="text-white" strokeWidth={2.4} />
          </span>
          <span className="font-semibold tracking-tight text-white">Prospecta</span>
        </Link>
      </header>
      <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Seus dados no Prospecta</h1>
          <p className="mt-1 text-sm text-ink-600">
            Sócios e administradores aparecem aqui porque constam nos dados públicos da Receita Federal. Se você não
            quer ser exibido, peça a remoção — vale na hora. Para acesso ou correção, respondemos em até 15 dias.
            Veja a <Link href="/privacidade" className="text-brand-600 underline">Política de Privacidade</Link>.
          </p>
        </div>
        <PedidoPrivacidade />
        <p className="text-xs text-ink-500">
          Também por e-mail: {CONTROLADOR.emailPrivacidade}. Não pedimos CPF nem documento neste formulário.
        </p>
      </main>
    </div>
  );
}
