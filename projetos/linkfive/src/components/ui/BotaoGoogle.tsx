"use client";

/**
 * "Continuar com o Google".
 *
 * É um link, e não um botão com fetch: o Google recusa ser carregado dentro de
 * outra página, então o navegador precisa navegar de verdade até lá.
 *
 * Só aparece quando as credenciais existem. Um botão de login que leva a um
 * erro é pior que não ter o botão — e antes de configurar o Google Cloud é
 * exatamente isso que ele seria.
 *
 * O desenho segue as regras da marca do Google: fundo branco, borda cinza, o
 * "G" colorido oficial e o texto em cinza escuro. É um dos poucos lugares onde
 * copiar o visual de outro é o certo — o visitante reconhece o botão antes de
 * ler, e um botão azul da nossa paleta com o "G" dentro pareceria falsificação.
 */
export function BotaoGoogle({ destino }: { destino?: string | null }) {
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  const href = destino
    ? `/api/auth/google?destino=${encodeURIComponent(destino)}`
    : "/api/auth/google";

  return (
    <>
      <a
        href={href}
        className="flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.65 3.58 9 3.58z"
          />
        </svg>
        Continuar com o Google
      </a>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-100" />
        <span className="text-[12px] text-ink-400">ou</span>
        <span className="h-px flex-1 bg-ink-100" />
      </div>
    </>
  );
}
