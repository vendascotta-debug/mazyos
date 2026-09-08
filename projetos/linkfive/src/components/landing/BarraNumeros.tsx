import { BadgeCheck, Ban, Layers, QrCode } from "lucide-react";

/**
 * A faixa de números embaixo do hero.
 *
 * A referência usa esse espaço para prova social — "10+ anos", "250+ projetos",
 * "98% de satisfação". Nós não temos nada disso: o produto nasceu esta semana
 * e não tem um cliente. Inventar número aqui seria a mentira mais fácil de
 * descobrir e a mais cara de consertar.
 *
 * Então a faixa carrega FATOS DO PRODUTO, todos verificáveis abrindo o site:
 * quantos tipos de link existem, quantos temas, o que está incluso no plano
 * gratuito. Quando houver cliente, é aqui que os números de verdade entram.
 */
const NUMEROS = [
  { icone: Layers, valor: "13", label: "tipos de link" },
  { icone: QrCode, valor: "QR", label: "incluso em todo plano" },
  { icone: BadgeCheck, valor: "1 min", label: "para publicar" },
  { icone: Ban, valor: "0", label: "anúncios, sempre" },
];

export function BarraNumeros() {
  return (
    <div className="border-t border-white/10">
      <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-px px-5 sm:grid-cols-4">
        {NUMEROS.map(({ icone: Icone, valor, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 py-6 sm:justify-center sm:border-l sm:border-white/10 sm:first:border-l-0"
          >
            <Icone size={22} className="shrink-0 text-brand-300" />
            <div>
              <p className="text-xl font-bold leading-none text-white">{valor}</p>
              <p className="mt-1 text-xs text-ink-400">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
