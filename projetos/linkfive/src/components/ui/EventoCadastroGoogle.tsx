"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@/components/ui/Analytics";

/**
 * Conta o cadastro pelo Google no GA4.
 *
 * O OAuth leva o visitante para fora do site e devolve no callback, que roda
 * no servidor — lá não existe `gtag`. Então o callback só deixa um recado num
 * cookie (`linkfive_novo`), e só quando a conta acabou de ser criada. Quem já
 * tinha conta não recebe o cookie, e por isso não conta como cadastro.
 *
 * Este componente lê o recado na primeira tela logada, dispara o evento uma
 * vez e apaga o cookie.
 *
 * O GA (`<Analytics />`) só é carregado quando o recado existe. A área logada
 * não mede visita — é a mesma regra de não misturar o tráfego dos clientes com
 * o nosso —, então ele não pode entrar sempre, só neste momento.
 */

const COOKIE = "linkfive_novo";
// 40 x 250 ms = 10 s esperando o script do GA definir `gtag`.
const TENTATIVAS = 40;

const temRecado = () => document.cookie.split("; ").includes(`${COOKIE}=google`);
const apagarRecado = () => {
  document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
};

export function EventoCadastroGoogle() {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    if (temRecado()) setAtivo(true);
  }, []);

  useEffect(() => {
    if (!ativo) return;

    let restantes = TENTATIVAS;
    const espera = setInterval(() => {
      const { gtag } = window as unknown as { gtag?: (...args: unknown[]) => void };
      if (typeof gtag === "function") {
        gtag("event", "sign_up", { method: "google" });
        apagarRecado();
        clearInterval(espera);
      } else if (--restantes <= 0) {
        // GA sem ID ou bloqueado: desiste e apaga, para não tentar em toda tela.
        apagarRecado();
        clearInterval(espera);
      }
    }, 250);

    return () => clearInterval(espera);
  }, [ativo]);

  return ativo ? <Analytics /> : null;
}
