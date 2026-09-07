"use client";

import { useEffect } from "react";

/**
 * Registro de visualização e clique na página pública.
 *
 * Por que não contar no servidor, durante o render: a página pública é
 * cacheada, e contar no render obrigaria a torná-la dinâmica — trocaríamos
 * velocidade no 4G por estatística. Aqui a página continua estática e o evento
 * viaja depois, sem segurar nada.
 *
 * O clique usa `sendBeacon`, que o navegador entrega mesmo com a aba já
 * navegando pro WhatsApp. Um `fetch` normal seria cancelado na saída e o
 * clique se perderia — justamente o clique que mais importa.
 */
export function Rastreador({ slug }: { slug: string }) {
  useEffect(() => {
    const corpo = JSON.stringify({ tipo: "view", slug });
    // keepalive pelo mesmo motivo do sendBeacon: sobreviver à saída da página.
    fetch("/api/eventos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: corpo,
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const alvo = (e.target as HTMLElement | null)?.closest("[data-link-id]");
      if (!alvo) return;
      const linkId = alvo.getAttribute("data-link-id");
      if (!linkId) return;

      const corpo = JSON.stringify({ tipo: "click", slug, linkId });
      const blob = new Blob([corpo], { type: "application/json" });
      // Se o navegador não tiver sendBeacon, o fetch com keepalive cobre.
      if (!navigator.sendBeacon?.("/api/eventos", blob)) {
        fetch("/api/eventos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: corpo,
          keepalive: true,
        }).catch(() => {});
      }
    }

    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, [slug]);

  return null;
}
