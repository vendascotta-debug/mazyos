import { Instagram, MapPin, MessageCircle, Phone, ShoppingBag } from "lucide-react";

/**
 * A representação da página LINKFIVE dentro de um smartphone, no hero.
 *
 * É marcação estática, não um preview de dados reais: o visitante da landing
 * não tem página nenhuma ainda. Mas usa as mesmas proporções e o mesmo desenho
 * de botão da página de verdade — a promessa visual precisa bater com o que ele
 * recebe depois de se cadastrar.
 */
const BOTOES = [
  { icone: MessageCircle, texto: "Falar no WhatsApp", destaque: true },
  { icone: Instagram, texto: "Instagram" },
  { icone: ShoppingBag, texto: "Ver catálogo" },
  { icone: MapPin, texto: "Como chegar" },
  { icone: Phone, texto: "(11) 3333-4444" },
];

export function HeroCelular() {
  return (
    <div className="mx-auto w-full max-w-[290px]">
      <div className="rounded-[40px] border-[11px] border-ink-900 bg-ink-900 shadow-2xl">
        <div className="rounded-[30px] bg-white">
          {/* Entalhe do topo, só pra leitura de "isso é um celular". */}
          <div className="flex justify-center pt-2.5">
            <span className="h-1.5 w-16 rounded-full bg-ink-200" />
          </div>

          <div className="px-5 pb-7 pt-5">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
                OC
              </div>
              <p className="mt-3 text-[15px] font-bold">Oficina do Carlos</p>
              <p className="mt-1 text-[12px] text-ink-500">
                Mecânica geral e elétrica em Santo André
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {BOTOES.map(({ icone: Icone, texto, destaque }) => (
                <div
                  key={texto}
                  className={`flex items-center gap-2 rounded-[10px] px-3 py-2.5 ${
                    destaque
                      ? "bg-brand-500 text-white"
                      : "border border-ink-200 bg-white text-ink-900"
                  }`}
                >
                  <Icone size={14} className="shrink-0 opacity-90" />
                  <span className="flex-1 text-center text-[12px] font-semibold">{texto}</span>
                  <span className="w-[14px] shrink-0" aria-hidden="true" />
                </div>
              ))}
            </div>

            <p className="mt-5 text-center text-[10px] text-ink-300">Feito com LINKFIVE</p>
          </div>
        </div>
      </div>
    </div>
  );
}
