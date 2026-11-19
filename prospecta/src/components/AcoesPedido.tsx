"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function AcoesPedido({ id, tipo, status }: { id: string; tipo: string; status: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function agir(acao: "aprovar" | "respondido" | "recusar" | "desfazer") {
    setOcupado(acao);
    try {
      await fetch("/api/admin/privacidade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, acao }),
      });
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  const botao = (acao: Parameters<typeof agir>[0], rotulo: string, cls = "btn-ghost") => (
    <button className={cls} disabled={!!ocupado} onClick={() => agir(acao)}>
      {ocupado === acao && <Loader2 size={14} className="animate-spin" />} {rotulo}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {status === "recebido" && tipo === "remocao" && botao("aprovar", "Aprovar remoção", "btn-brand")}
      {status === "recebido" && botao("respondido", "Marcar respondido")}
      {status === "recebido" && botao("recusar", "Recusar")}
      {status === "aprovado" && botao("desfazer", "Desfazer remoção")}
    </div>
  );
}
