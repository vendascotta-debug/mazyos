"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Campo de senha com o olho para revelar o que foi digitado.
 *
 * Existe porque senha escondida erra mais: no celular, com teclado corretor e
 * letra maiúscula automática, a pessoa digita certo, o campo mostra bolinhas, e
 * ela só descobre o engano no "senha incorreta". O olho troca uma adivinhação
 * por uma conferida.
 *
 * Começa sempre escondido, e volta a esconder ao trocar de tela — revelar é uma
 * decisão de quem está na frente do aparelho, não um estado que fica ligado.
 *
 * O botão não entra na navegação por Tab (`tabIndex={-1}`): quem usa teclado
 * quer sair do campo direto para o botão de entrar, e não tropeçar num controle
 * opcional no meio do caminho.
 */
export function CampoSenha({
  id,
  rotulo,
  valor,
  aoMudar,
  autoComplete,
  minLength,
  autoFocus = false,
  required = true,
  acessorio,
  ajuda,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  autoComplete: string;
  minLength?: number;
  autoFocus?: boolean;
  required?: boolean;
  /** Canto direito do rótulo — o "Esqueci minha senha" da tela de login. */
  acessorio?: React.ReactNode;
  ajuda?: string;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="label" htmlFor={id}>
          {rotulo}
        </label>
        {acessorio}
      </div>

      <div className="relative">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          /* Espaço à direita para o texto não passar por baixo do botão. */
          className="input pr-11"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          tabIndex={-1}
          className="absolute right-1 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-[8px] text-ink-400 transition-colors hover:text-ink-700"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          title={visivel ? "Ocultar senha" : "Mostrar senha"}
        >
          {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>

      {ajuda && <p className="mt-1 text-[12px] text-ink-400">{ajuda}</p>}
    </div>
  );
}
