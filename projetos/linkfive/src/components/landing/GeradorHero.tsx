"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Copy, Download, ExternalLink, Loader2, QrCode } from "lucide-react";
import { MENSAGEM_PADRAO } from "@/lib/links";
import { pareceUrl } from "@/lib/curtos";

/**
 * O gerador que funciona antes do cadastro.
 *
 * É a peça de conversão da landing, e até 08/09/2026 ela prometia mais do que
 * entregava: montava um `wa.me` no navegador e chamava aquilo de link. O
 * visitante saía com um endereço que não é nosso, que não conta clique nenhum
 * e que ele não podia trocar depois — e o único campo aceitava telefone, então
 * quem colava o convite de um grupo ouvia "faltam dígitos, inclua o DDD".
 *
 * Agora ele encurta de verdade, no nosso domínio, com código personalizado e
 * QR — antes de existir conta. É o passo a passo do concorrente, e é o que
 * torna o cadastro uma consequência em vez de um pedágio: quando o botão
 * "criar conta e salvar" aparece, o visitante já tem uma coisa concreta a
 * perder.
 *
 * O link nasce com 30 dias de prazo e o servidor guarda o id num cookie
 * assinado. Criar a conta adota o link e apaga o prazo.
 */
type Aba = "url" | "qr" | "whatsapp";

interface Resultado {
  code: string;
  tipo: "url" | "whatsapp";
  destino: string;
  url: string;
  salvo: boolean;
  diasParaExpirar: number;
}

const ABAS: { id: Aba; label: string }[] = [
  { id: "url", label: "Encurtador de Link" },
  { id: "qr", label: "QR Code" },
  { id: "whatsapp", label: "Link para WhatsApp" },
];

const MODELOS = [
  { label: "Primeiro contato", texto: MENSAGEM_PADRAO },
  { label: "Orçamento", texto: "Olá! Gostaria de um orçamento, por favor." },
  { label: "Agendar", texto: "Olá! Queria agendar um horário. Quais dias vocês têm?" },
  { label: "Catálogo", texto: "Olá! Pode me mandar o catálogo com os preços?" },
  { label: "Suporte", texto: "Olá! Preciso de ajuda com uma compra que fiz." },
];

export function GeradorHero() {
  const [aba, setAba] = useState<Aba>("url");

  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);

  const [personalizar, setPersonalizar] = useState(false);
  const [codigo, setCodigo] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [copiado, setCopiado] = useState(false);

  // O campo de telefone recebendo um endereço é o erro mais comum aqui — em
  // vez de recusar, a tela oferece a aba certa levando o que já foi digitado.
  const colouLinkNoTelefone = aba === "whatsapp" && pareceUrl(numero);

  function trocarAba(nova: Aba) {
    setAba(nova);
    setErro("");
    setResultado(null);
  }

  function levarParaEncurtador() {
    setEndereco(numero);
    setNumero("");
    trocarAba("url");
  }

  async function gerar() {
    setErro("");
    setEnviando(true);
    try {
      const corpo =
        aba === "whatsapp"
          ? { tipo: "whatsapp", numero, mensagem }
          : { tipo: "url", url: endereco };

      const r = await fetch("/api/curtos/publico", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...corpo,
          code: personalizar && codigo.trim() ? codigo.trim() : undefined,
        }),
      });
      const dados = await r.json().catch(() => null);

      if (!r.ok) {
        setErro(dados?.erro ?? "Não foi possível criar o link. Tente de novo.");
        return;
      }

      setResultado({
        code: dados.curto.code,
        tipo: dados.curto.tipo,
        destino: dados.curto.destino,
        url: dados.url,
        salvo: Boolean(dados.salvo),
        diasParaExpirar: dados.diasParaExpirar,
      });
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem permissão de área de transferência: o link continua na tela.
    }
  }

  function recomecar() {
    setResultado(null);
    setErro("");
    setCodigo("");
    setPersonalizar(false);
  }

  const preenchido = aba === "whatsapp" ? numero.trim().length > 0 : endereco.trim().length > 0;

  return (
    <div className="card mt-7 p-5 shadow-2xl sm:p-6">
      {/* O que o produto é, em letra grande. Quem chega pelo Google procurando
          "encurtador de link" precisa achar a palavra na primeira dobra. */}
      <h2 className="text-[22px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[26px]">
        Encurtador de link grátis
      </h2>
      <p className="mt-1 text-[15px] text-ink-600">
        Cole o endereço e receba o link curto e o QR Code na hora.{" "}
        <strong className="text-ink-900">Sem criar conta.</strong>
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="O que você quer criar">
        {ABAS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={aba === t.id}
            onClick={() => trocarAba(t.id)}
            className={`rounded-[10px] border px-3 py-2 text-[14px] font-medium transition-colors ${
              aba === t.id
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-ink-200 text-ink-600 hover:border-brand-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {resultado ? (
        <Pronto
          resultado={resultado}
          copiado={copiado}
          aoCopiar={() => copiar(resultado.url)}
          aoRecomecar={recomecar}
        />
      ) : (
        <div className="mt-4">
          {aba === "whatsapp" ? (
            <>
              <input
                className="input-grande"
                value={numero}
                inputMode="tel"
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Seu WhatsApp com DDD — ex.: 11 99999-9999"
                aria-label="Número do WhatsApp"
              />

              {colouLinkNoTelefone && (
                <div className="mt-2 rounded-[10px] border border-brand-200 bg-brand-50 px-3 py-2.5 text-[13px] text-ink-700">
                  Isso é um endereço, não um telefone.{" "}
                  <button
                    onClick={levarParaEncurtador}
                    className="font-semibold text-brand-600 underline underline-offset-2"
                  >
                    Encurtar esse link
                  </button>{" "}
                  no lugar?
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {MODELOS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setMensagem(m.texto)}
                    className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
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
                className="input mt-2.5 min-h-[64px] resize-y text-[14px]"
                value={mensagem}
                maxLength={300}
                onChange={(e) => setMensagem(e.target.value)}
                aria-label="Mensagem que já vem digitada"
              />
            </>
          ) : (
            <input
              className="input-grande"
              value={endereco}
              inputMode="url"
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Cole aqui seu link. Ex.: chat.whatsapp.com/... ou seusite.com.br"
              aria-label="Endereço para encurtar"
            />
          )}

          <CodigoPersonalizado
            ligado={personalizar}
            valor={codigo}
            aoLigar={setPersonalizar}
            aoDigitar={setCodigo}
          />

          {erro && <p className="mt-3 text-[13px] font-medium text-danger-500">{erro}</p>}

          <button
            onClick={gerar}
            disabled={!preenchido || enviando}
            className="btn-brand mt-4 w-full justify-center py-3 text-[16px] disabled:opacity-50"
          >
            {enviando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Criando…
              </>
            ) : aba === "qr" ? (
              <>
                <QrCode size={16} /> Gerar QR Code
              </>
            ) : (
              <>Encurtar link</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * "Deseja personalizar o código do seu link?"
 *
 * Fica fechado por padrão porque o caminho rápido é o que converte — mas
 * existe na primeira tela, e não escondido dentro do painel, porque escolher
 * `/w/promo-julho` é justamente o que faz o produto parecer sério.
 */
function CodigoPersonalizado({
  ligado,
  valor,
  aoLigar,
  aoDigitar,
}: {
  ligado: boolean;
  valor: string;
  aoLigar: (v: boolean) => void;
  aoDigitar: (v: string) => void;
}) {
  return (
    <div className="mt-3.5 rounded-[12px] border border-ink-200 bg-ink-50/60 p-3.5">
      <p className="text-[14px] font-semibold text-ink-900">
        Deseja personalizar o código do seu link?
      </p>
      <p className="mt-0.5 text-[12.5px] text-ink-500">
        Quando não informado, o código é gerado automaticamente.
      </p>

      <div className="mt-2.5 flex gap-1.5">
        {[
          { rotulo: "Não", v: false },
          { rotulo: "Sim", v: true },
        ].map((o) => (
          <button
            key={o.rotulo}
            type="button"
            onClick={() => aoLigar(o.v)}
            className={`rounded-full border px-5 py-1.5 text-[13px] font-medium transition-colors ${
              ligado === o.v
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-ink-200 bg-white text-ink-600 hover:border-brand-300"
            }`}
          >
            {o.rotulo}
          </button>
        ))}
      </div>

      {ligado && (
        <div className="mt-2.5 flex items-center overflow-hidden rounded-[10px] border border-ink-200 bg-white">
          <span className="shrink-0 border-r border-ink-200 bg-ink-50 px-2.5 py-2 text-[13px] text-ink-500">
            linkfive.com.br/w/
          </span>
          <input
            className="min-w-0 flex-1 px-2.5 py-2 text-[14px] outline-none"
            value={valor}
            onChange={(e) => aoDigitar(e.target.value)}
            placeholder="seu-codigo"
            aria-label="Código personalizado"
          />
        </div>
      )}
    </div>
  );
}

/** O que o visitante vê depois que o link existe de verdade. */
function Pronto({
  resultado,
  copiado,
  aoCopiar,
  aoRecomecar,
}: {
  resultado: Resultado;
  copiado: boolean;
  aoCopiar: () => void;
  aoRecomecar: () => void;
}) {
  return (
    <div className="mt-4 rounded-[12px] border-2 border-brand-200 bg-brand-50/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="mx-auto w-[132px] shrink-0 rounded-[10px] border border-ink-200 bg-white p-2 sm:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qrcode?code=${encodeURIComponent(resultado.code)}&formato=svg`}
            alt={`QR Code do link ${resultado.url}`}
            className="w-full"
          />
          <a
            href={`/api/qrcode?code=${encodeURIComponent(resultado.code)}&formato=png&tamanho=1024`}
            className="mt-1.5 flex items-center justify-center gap-1 text-[12px] font-medium text-brand-600 hover:underline"
          >
            <Download size={12} /> Baixar PNG
          </a>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-ink-500">
            Link: <span className="text-ink-600">{resultado.destino}</span>
          </p>

          <p className="mt-2 text-[13px] font-medium text-ink-500">Link encurtado:</p>
          <button
            onClick={aoCopiar}
            className="mt-1 flex w-full items-center gap-2 rounded-[10px] border-2 border-brand-300 bg-white px-3 py-2.5 text-left hover:border-brand-500"
          >
            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-brand-600">
              {resultado.url}
            </span>
            {copiado ? (
              <Check size={16} className="shrink-0 text-ok-500" />
            ) : (
              <Copy size={16} className="shrink-0 text-ink-400" />
            )}
          </button>
          {copiado && <p className="mt-1 text-[12px] font-medium text-ok-500">Link copiado.</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={resultado.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-[14px]"
            >
              <ExternalLink size={14} /> Testar link
            </a>
            <button onClick={aoRecomecar} className="btn-ghost text-[14px]">
              Criar outro
            </button>
          </div>
        </div>
      </div>

      {/* O gancho. O link já funciona — o que falta é tudo que só existe com
          conta, e o prazo de 30 dias é dito na cara, não escondido. */}
      <div className="mt-4 border-t border-brand-200 pt-3.5">
        {resultado.salvo ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-[13.5px] text-ink-600">
              Esse link já está salvo na sua conta, com contador de cliques.
            </p>
            <Link href="/app/curtos" className="btn-brand text-[14px]">
              Ver no painel <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-[13.5px] leading-relaxed text-ink-600">
              Quer saber quem clicou nesse link?{" "}
              <strong className="text-ink-900">Crie sua conta grátis e leve ele junto.</strong> Você
              passa a ver cliques, origem e aparelho de cada acesso — e sem conta o link sai do ar
              em {resultado.diasParaExpirar} dias.
            </p>
            <Link href="/cadastrar" className="btn-brand text-[14px]">
              Criar conta e salvar link <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
