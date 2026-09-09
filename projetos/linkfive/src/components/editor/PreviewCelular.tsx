"use client";

import { useState } from "react";

import {
  BookOpen,
  ClipboardList,
  Facebook,
  Instagram,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  ShoppingBag,
  Wrench,
  Youtube,
} from "lucide-react";
import type { Page, PageLink } from "@/lib/types";
import { varsObj } from "@/lib/temas";
import { iniciais as calcularIniciais } from "@/lib/iniciais";

const ICONES = {
  link: LinkIcon,
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  youtube: Youtube,
  maps: MapPin,
  phone: Phone,
  email: Mail,
  catalog: BookOpen,
  product: ShoppingBag,
  service: Wrench,
  form: ClipboardList,
} as const;

/**
 * A página real dentro de uma moldura de celular.
 *
 * Reproduz a marcação da página pública em escala menor, usando as MESMAS
 * variáveis de tema — é o que garante que o preview não minta. Não é um
 * iframe: um iframe recarregaria a cada tecla e o preview ao vivo morreria.
 */
export function PreviewCelular({ page, links }: { page: Page; links: PageLink[] }) {
  // Reseta quando o endereço muda: uma imagem quebrada não pode condenar a
  // próxima que a pessoa colar.
  const [quebrouEm, setQuebrouEm] = useState<string | null>(null);
  const fotoQuebrada = Boolean(page.avatarUrl) && quebrouEm === page.avatarUrl;
  const setFotoQuebrada = () => setQuebrouEm(page.avatarUrl ?? null);

  const iniciais = calcularIniciais(page.title || "?");

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="rounded-[36px] border-[10px] border-ink-900 bg-ink-900 shadow-xl">
        <div
          className="h-[560px] overflow-y-auto rounded-[26px]"
          style={{
            ...(varsObj(page.themeId, page.themeOverrides) as React.CSSProperties),
            background: "var(--lf-fundo)",
            color: "var(--lf-texto)",
          }}
        >
          <div className="px-5 pb-8 pt-8">
            <div className="flex flex-col items-center text-center">
              {page.avatarUrl && !fotoQuebrada ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                  style={{ border: "2px solid var(--lf-cardBorda)" }}
                  // Endereço que não carrega vira iniciais, e não o ícone de
                  // imagem partida — a prévia tem de mostrar o que o visitante
                  // veria, não um erro do navegador.
                  onError={setFotoQuebrada}
                />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold"
                  style={{ background: "var(--lf-destaque)", color: "var(--lf-destaqueTexto)" }}
                >
                  {iniciais}
                </div>
              )}

              <p className="mt-3 text-[15px] font-bold">{page.title || "Sua página"}</p>

              {page.bio && (
                <p className="mt-1.5 text-[12px]" style={{ color: "var(--lf-textoSuave)" }}>
                  {page.bio}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {links.length === 0 ? (
                <p className="text-center text-[12px]" style={{ color: "var(--lf-textoSuave)" }}>
                  Seus links aparecem aqui.
                </p>
              ) : (
                links.map((l) => {
                  const Icone = ICONES[l.type] ?? LinkIcon;
                  const destaque = l.type === "whatsapp" || l.type === "form";
                  return (
                    <div
                      key={l.id}
                      className="flex items-center gap-2 px-3 py-2.5"
                      style={{
                        background: destaque ? "var(--lf-destaque)" : "var(--lf-botaoFundo)",
                        color: destaque ? "var(--lf-destaqueTexto)" : "var(--lf-botaoTexto)",
                        border: destaque ? "1px solid transparent" : "1px solid var(--lf-botaoBorda)",
                        borderRadius: "var(--lf-raio)",
                        boxShadow: "var(--lf-sombra)",
                      }}
                    >
                      <Icone size={14} className="shrink-0 opacity-90" />
                      <span className="min-w-0 flex-1 truncate text-center text-[12px] font-semibold">
                        {l.title}
                      </span>
                      <span className="w-[14px] shrink-0" aria-hidden="true" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
