import { Database } from "lucide-react";

/**
 * Nota de procedência. A base saiu da demonstração e passou a ser real, mas
 * dado real tem limites que o usuário precisa conhecer antes de sair ligando:
 * o mapa é preciso na cidade, não na rua, e site/redes ainda não vêm da fonte.
 */
export function DemoBanner() {
  return (
    <div className="flex items-start gap-2.5 border-b border-sky-200 bg-sky-50 px-4 py-2.5 sm:px-7">
      <Database size={15} className="mt-0.5 shrink-0 text-sky-600" />
      <p className="text-xs leading-relaxed text-sky-900">
        <strong className="font-semibold">Dados reais da Receita Federal</strong> —
        103 mil empresas ativas de São Paulo, com CNPJ, telefone, e-mail e quadro
        societário verdadeiros (base de janeiro/2026).{" "}
        <span className="text-sky-700">
          O mapa posiciona pela cidade, não pela rua: a Receita publica endereço,
          não coordenada. Site e redes sociais ainda não vêm dessa fonte.
        </span>
      </p>
    </div>
  );
}
