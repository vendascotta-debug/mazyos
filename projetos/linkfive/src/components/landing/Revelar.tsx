"use client";

import { useEffect, useRef } from "react";

/**
 * Anima o conteúdo quando ele entra na tela.
 *
 * IntersectionObserver em vez de escutar o scroll: o navegador avisa quando o
 * elemento aparece, sem rodar código a cada pixel rolado. Numa página longa,
 * a diferença aparece como travamento no celular.
 *
 * Depois que revela, para de observar. Um elemento que reanima toda vez que
 * você sobe e desce a página cansa em vez de encantar.
 *
 * Sem JavaScript — ou se o observador não existir — o conteúdo aparece normal:
 * a classe `visivel` entra na marra e a página não fica em branco.
 */
export function Revelar({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "ul";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      el.classList.add("visivel");
      return;
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add("visivel");
            obs.unobserve(e.target);
          }
        }
      },
      // Dispara um pouco antes de encostar na borda: o elemento já chega
      // animando, em vez de aparecer parado e só então se mexer.
      { rootMargin: "0px 0px -80px 0px", threshold: 0.05 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag ref={ref as React.Ref<never>} className={`revelar ${className}`}>
      {children}
    </Tag>
  );
}
