"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { MENSAGEM_PADRAO, linkWhatsapp, normalizarTelefone, telefoneValido } from "@/lib/links";

/**
 * O gerador que funciona antes do cadastro.
 *
 * É a peça de conversão da landing: em vez de pedir e-mail para o visitante
 * descobrir se o produto presta, ele digita o número e recebe o link e o QR na
 * hora. Depois de ver funcionando, criar conta deixa de ser um salto no
 * escuro.
 *
 * O link é montado no cliente (`linkWhatsapp` é função pura). O QR vem de uma
 * rota do servidor — trazer a biblioteca de QR para o navegador custaria uns
 * 50KB no primeiro carregamento da página mais importante do site.
 */
const MODELOS = [
  { label: "Primeiro contato", texto: MENSAGEM_PADRAO },
  { label: "Orçamento", texto: "Olá! Gostaria de um orçamento, por favor." },
  { label: "Agendar", texto: "Olá! Queria agendar um horário. Quais dias vocês têm?" },
  { label: "Catálogo", texto: "Olá! Pode me mandar o catálogo com os preços?" },
  { label: "Suporte", texto: "Olá! Preciso de ajuda com uma compra que fiz." },
];

export function GeradorHero() {
  const [numero, setNumero] = useState("");
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [copiado, setCopiado] = useState(false);

  const valido = telefoneValido(numero);
  const link = valido ? linkWhatsapp(numero, mensagem) : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem permissão de área de transferência: o link continua na tela.
    }
  }

  return (
    <div className="card mt-8 p-6 shadow-2xl sm:p-7">
      {/* O que o produto é, em letra grande. Antes isso estava implícito no
          headline, e quem chegava pelo Google procurando "encurtador de link"
          não encontrava a palavra em lugar nenhum da dobra. */}
      <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[30px]">
        Encurtador de link do WhatsApp
      </h2>
      <p className="mt-1.5 text-[16px] text-ink-600">
        Cole seu número e receba o link e o QR Code na hora.{" "}
        <strong className="text-ink-900">Sem criar conta.</strong>
      </p>

      <div className="mt-5">
        <input
          className="input-grande"
          value={numero}
          inputMode="tel"
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Seu WhatsApp com DDD — ex.: 11 99999-9999"
          aria-label="Número do WhatsApp"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {MODELOS.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => setMensagem(m.texto)}
            className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
              mensagem === m.texto
                ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                : "border-ink-200 text-ink-600 hover:border-brand-300"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <textarea
        className="input mt-3 min-h-[70px] resize-y text-[15px]"
        value={mensagem}
        maxLength={300}
        onChange={(e) => setMensagem(e.target.value)}
        aria-label="Mensagem que já vem digitada"
      />

      {valido ? (
        <div className="mt-4 flex flex-col gap-4 rounded-[12px] bg-ink-50 p-4 sm:flex-row">
          <div
            className="mx-auto w-[116px] shrink-0 rounded-[10px] border border-ink-200 bg-white p-2 sm:mx-0"
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr-whatsapp?numero=${encodeURIComponent(
                normalizarTelefone(numero),
              )}&mensagem=${encodeURIComponent(mensagem)}`}
              alt=""
              className="w-full"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink-500">Seu link está pronto</p>
            <button
              onClick={copiar}
              className="mt-1.5 flex w-full items-center gap-2 rounded-[10px] border border-ink-200 bg-white px-3 py-2 text-left text-sm hover:border-brand-300"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-brand-600">{link}</span>
              {copiado ? (
                <Check size={15} className="shrink-0 text-ok-500" />
              ) : (
                <Copy size={15} className="shrink-0 text-ink-400" />
              )}
            </button>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-[15px]"
              >
                Testar conversa
              </a>
              <Link href="/cadastrar" className="btn-brand text-[15px]">
                Quero um link curto meu <ArrowRight size={14} />
              </Link>
            </div>

            {/* O gancho: o que ele acabou de ganhar é útil, mas é longo e não
                conta nada. O que falta é exatamente o produto. */}
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
              Esse link funciona, mas é comprido e você não sabe quem clicou. Com uma conta grátis
              ele vira <strong>linkfive.com.br/w/seunome</strong>, com contador de cliques e QR pra
              imprimir.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-ink-400">
          {numero ? "Faltam dígitos — inclua o DDD." : "O link aparece aqui assim que você digitar."}
        </p>
      )}
    </div>
  );
}
