import { FlaskConical } from "lucide-react";

/**
 * A base atual é gerada (ver src/lib/seed.ts). Sem este aviso, o usuário perde
 * tempo clicando em site e LinkedIn que não existem e acha que é bug.
 * Some sozinho quando `PROSPECTA_DADOS_REAIS=1` — ou seja, quando os
 * conectores de dados públicos estiverem alimentando a base.
 */
export function DemoBanner() {
  if (process.env.PROSPECTA_DADOS_REAIS === "1") return null;

  return (
    <div className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-7 py-2.5">
      <FlaskConical size={15} className="mt-0.5 shrink-0 text-amber-600" />
      <p className="text-xs leading-relaxed text-amber-900">
        <strong className="font-semibold">Base de demonstração.</strong> Empresas,
        CNPJs, telefones, sites e perfis são gerados para você testar o sistema —
        os links não abrem porque essas empresas não existem. A estrutura é real:
        ao conectar as fontes públicas (Receita Federal, mapas abertos, LinkedIn),
        os mesmos campos passam a trazer dados verdadeiros.
      </p>
    </div>
  );
}
