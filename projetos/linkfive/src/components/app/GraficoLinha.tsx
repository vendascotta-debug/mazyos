import type { DailyStat } from "@/lib/types";

/**
 * Gráfico de linha em SVG puro.
 *
 * Sem biblioteca de propósito: uma lib de chart custa ~100KB no bundle para
 * desenhar duas séries. Aqui são ~60 linhas, renderizam no servidor e chegam
 * ao cliente como HTML pronto.
 */
export function GraficoLinha({
  serie,
  campo,
  cor,
  altura = 160,
}: {
  serie: DailyStat[];
  campo: "views" | "clicks";
  cor: string;
  altura?: number;
}) {
  const valores = serie.map((d) => d[campo]);
  const max = Math.max(...valores, 1);
  const largura = 100; // viewBox em porcentagem; o SVG estica com o container
  const passo = valores.length > 1 ? largura / (valores.length - 1) : 0;

  const pontos = valores.map((v, i) => {
    const x = i * passo;
    // 6% de folga no topo pra linha não encostar na borda do gráfico
    const y = 100 - (v / max) * 94;
    return [x, y] as const;
  });

  const linha = pontos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${linha} L${largura},100 L0,100 Z`;

  const temDado = valores.some((v) => v > 0);
  const idGradiente = `grad-${campo}`;

  return (
    <div className="w-full" style={{ height: altura }}>
      {!temDado ? (
        <div className="flex h-full items-center justify-center text-sm text-ink-400">
          Sem dados nesse período ainda.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${largura} 100`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={`Evolução de ${campo === "views" ? "visualizações" : "cliques"}`}
        >
          <defs>
            <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={cor} stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={area} fill={`url(#${idGradiente})`} />
          <path
            d={linha}
            fill="none"
            stroke={cor}
            strokeWidth="2"
            // vectorEffect mantém a linha com 2px reais mesmo com o SVG
            // esticado pelo preserveAspectRatio="none".
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
