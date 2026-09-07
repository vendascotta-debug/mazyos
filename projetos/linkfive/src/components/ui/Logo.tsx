/**
 * Marca do LINKFIVE.
 *
 * O símbolo é um "5" formado por dois elos — o cinco do nome e a ideia de
 * link, na mesma forma. Nada de ícone de corrente genérico.
 */
export function Logo({ size = 28, mono = false }: { size?: number; mono?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill={mono ? "currentColor" : "var(--color-brand-500)"} />
        <path
          d="M11 9h10M11 9v6h5.5a4.5 4.5 0 1 1 0 9H12"
          stroke={mono ? "var(--color-brand-500)" : "#fff"}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[17px] font-bold tracking-tight">
        LINK<span className="text-brand-500">FIVE</span>
      </span>
    </span>
  );
}
