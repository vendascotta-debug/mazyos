/**
 * Marca do LINKFIVE.
 *
 * O símbolo é um "5" cujo laço de baixo é um elo — o cinco do nome e a ideia de
 * link na mesma forma. Redesenhado em 09/09/2026 a partir do logotipo novo:
 * saiu o quadrado azul, entrou o degradê do azul claro para o azul-marinho, e o
 * elo ficou explícito atravessando a curva.
 *
 * É vetor, e não a imagem do logotipo, por duas razões práticas: no cabeçalho
 * ele aparece com 28 pixels de altura, onde um PNG fica borrado; e o topo da
 * landing é escuro, onde o fundo claro do arquivo viraria um retângulo branco.
 *
 * `mono` troca o degradê pela cor herdada, para o logo vencer um fundo escuro.
 * O elo continua verde nos dois casos: é o acento do logotipo, e sem ele o "5"
 * perde justamente a ideia de link.
 */
export function Logo({ size = 28, mono = false }: { size?: number; mono?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {!mono && (
          <defs>
            {/* Do azul claro no topo ao azul-marinho embaixo, como no logotipo.
                O id é fixo: o mesmo degradê serve a todas as instâncias da
                página, e duplicar a definição só pesaria o HTML. */}
            <linearGradient id="lf5" x1="4" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="0.45" stopColor="#1e6bff" />
              <stop offset="1" stopColor="#0a1a3a" />
            </linearGradient>
          </defs>
        )}

        {/* O "5": barra de cima, haste e o laço. Traço grosso para aguentar
            tamanho pequeno — em 28px, linha fina some. */}
        <path
          d="M9.5 5.5h13M9.5 5.5v8h6.5a6 6 0 1 1 0 12h-5"
          stroke={mono ? "currentColor" : "url(#lf5)"}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* O elo que atravessa o laço. O contorno na cor do fundo é o que abre o
            vão e faz a leitura de corrente, em vez de duas formas encostadas. */}
        <path
          d="M14.2 19.6h5.2"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          /* No claro o vão é branco; no escuro ele herda o fundo. Em ambos os
             casos é o vão que separa o elo do laço e faz a leitura de corrente. */
          className={mono ? "text-ink-950" : "text-white"}
        />
        <path
          d="M14.6 19.6h4.4"
          stroke="#22d3a6"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      <span className="text-[17px] font-bold tracking-tight">
        Link
        {/* No escuro o azul da marca fica pesado demais contra o azul-marinho.
            O ciano da paleta é o mesmo acento, e ali ele se lê. */}
        <span className={mono ? "text-accent-500" : "text-brand-500"}>Five</span>
      </span>
    </span>
  );
}
