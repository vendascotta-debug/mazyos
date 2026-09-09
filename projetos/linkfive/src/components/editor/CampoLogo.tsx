"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";

/**
 * A logo da página: clica na bola e escolhe o arquivo.
 *
 * Antes havia só um campo de endereço, e o primeiro dono de página real colou
 * ali o endereço do próprio site em vez do da imagem. A página saiu com o
 * círculo quebrado e nenhuma pista do motivo — o campo aceitou calado.
 *
 * Clicar na imagem é onde a pessoa procura. O campo de endereço continua
 * existindo, recolhido, para quem já tem a imagem publicada em outro lugar —
 * mas deixou de ser o caminho principal.
 *
 * A prévia é o próprio botão: o que você vê é o que a página vai mostrar. Se
 * o endereço colado não for uma imagem, o erro aparece aqui, no editor, e não
 * na página publicada.
 */
export function CampoLogo({
  valor,
  aoMudar,
  iniciais,
}: {
  valor: string | null;
  aoMudar: (url: string | null) => void;
  /** Duas letras do nome, mostradas enquanto não há imagem. */
  iniciais: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [quebrada, setQuebrada] = useState(false);
  const [mostrarUrl, setMostrarUrl] = useState(false);

  async function enviar(arquivo: File) {
    setErro(null);
    setEnviando(true);
    try {
      const dados = new FormData();
      dados.append("arquivo", arquivo);
      const r = await fetch("/api/upload", { method: "POST", body: dados });
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Não foi possível enviar a imagem.");
        return;
      }
      setQuebrada(false);
      aoMudar(d.url);
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <span className="label">Logo ou foto</span>

      <div className="mt-1.5 flex items-center gap-4">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={enviando}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-ink-200 bg-ink-50 transition-colors hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          title="Escolher imagem"
          aria-label="Escolher a logo da página"
        >
          {valor && !quebrada ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={valor}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setQuebrada(true)}
              onLoad={() => setQuebrada(false)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-ink-400">
              {iniciais}
            </span>
          )}

          {/* A camada com a câmera só aparece no hover: sem ela, a bola não
              parece clicável; sempre visível, esconderia a prévia. */}
          <span className="absolute inset-0 flex items-center justify-center bg-ink-950/55 opacity-0 transition-opacity group-hover:opacity-100">
            {enviando ? (
              <Loader2 size={20} className="animate-spin text-white" />
            ) : (
              <Camera size={20} className="text-white" />
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={enviando}
            className="btn-ghost text-[14px]"
          >
            {enviando ? "Enviando…" : valor ? "Trocar imagem" : "Escolher imagem"}
          </button>

          {valor && (
            <button
              type="button"
              onClick={() => {
                aoMudar(null);
                setQuebrada(false);
                setErro(null);
              }}
              className="ml-2 inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-danger-500"
            >
              <Trash2 size={13} /> Remover
            </button>
          )}

          <p className="mt-1.5 text-xs text-ink-400">
            PNG, JPG, WEBP ou GIF, até 2 MB. Fica melhor quadrada.
          </p>
        </div>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) enviar(f);
          // Zera para o mesmo arquivo poder ser escolhido de novo depois de um
          // erro — sem isto, o segundo clique no mesmo arquivo não dispara nada.
          e.target.value = "";
        }}
      />

      {/* O aviso que faltava: endereço colado que não carrega. */}
      {valor && quebrada && (
        <p className="erro mt-2">
          Esse endereço não carregou como imagem. Se você copiou o endereço do site, volte nele,
          clique com o botão direito na logo e escolha &ldquo;Copiar endereço da imagem&rdquo; — ou
          use o botão acima para enviar o arquivo.
        </p>
      )}

      {erro && <p className="erro mt-2">{erro}</p>}

      <button
        type="button"
        onClick={() => setMostrarUrl((v) => !v)}
        className="mt-2 text-[13px] text-ink-500 hover:underline"
      >
        {mostrarUrl ? "Esconder" : "Já tenho o endereço da imagem"}
      </button>

      {mostrarUrl && (
        <input
          className="input mt-1.5"
          value={valor ?? ""}
          onChange={(e) => {
            setQuebrada(false);
            aoMudar(e.target.value || null);
          }}
          placeholder="https://... .png"
        />
      )}
    </div>
  );
}
