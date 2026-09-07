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
import type { PageLink } from "@/lib/types";

// Server Component: os ícones viram SVG no HTML, sem custo de JS no cliente.
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
 * Um botão da página pública.
 *
 * O `data-link-id` é o que o Rastreador escuta — nenhum handler é anexado
 * botão a botão, o que manteria a página cheia de JavaScript à toa.
 */
export function BotaoLink({ link }: { link: PageLink }) {
  const Icone = ICONES[link.type] ?? LinkIcon;
  // WhatsApp e formulário são os botões que geram cliente: ganham a cor de
  // destaque do tema. O resto fica discreto, pra o destaque significar algo.
  const destaque = link.type === "whatsapp" || link.type === "form";

  const estilo = destaque
    ? {
        background: "var(--lf-destaque)",
        color: "var(--lf-destaqueTexto)",
        border: "1px solid transparent",
        borderRadius: "var(--lf-raio)",
        boxShadow: "var(--lf-sombra)",
      }
    : {
        background: "var(--lf-botaoFundo)",
        color: "var(--lf-botaoTexto)",
        border: "1px solid var(--lf-botaoBorda)",
        borderRadius: "var(--lf-raio)",
        boxShadow: "var(--lf-sombra)",
      };

  const conteudo = (
    <>
      <Icone size={19} className="shrink-0 opacity-90" />
      <span className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold">
        {link.title}
      </span>
      {/* Espaçador do tamanho do ícone: mantém o texto opticamente centralizado
          sem precisar de grid. */}
      <span className="w-[19px] shrink-0" aria-hidden="true" />
    </>
  );

  if (link.type === "form") {
    return (
      <a
        href="#formulario"
        data-link-id={link.id}
        className="flex items-center gap-3 px-4 py-3.5 transition-transform active:scale-[.99]"
        style={estilo}
      >
        {conteudo}
      </a>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      // noopener fecha o acesso do site de destino à nossa aba; noreferrer
      // evita entregar a origem do clique.
      rel="noopener noreferrer"
      data-link-id={link.id}
      className="flex items-center gap-3 px-4 py-3.5 transition-transform active:scale-[.99]"
      style={estilo}
    >
      {conteudo}
    </a>
  );
}
