import type { LinkConfig, LinkType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Regras de cada tipo de link: como o botão se chama, que ícone usa, e como a
// URL final é montada a partir do que o usuário digitou.
//
// A montagem acontece SEMPRE no servidor, na hora de salvar. Se ficasse só no
// front, um link salvo por uma versão antiga da tela continuaria quebrado pra
// sempre.
// ---------------------------------------------------------------------------

export interface TipoInfo {
  label: string;
  /** Nome do ícone no lucide-react. */
  icone: string;
  /** Texto de ajuda no campo principal do formulário. */
  placeholder: string;
  /** Cor de destaque do tipo, usada no editor. */
  cor: string;
}

export const TIPOS: Record<LinkType, TipoInfo> = {
  whatsapp: { label: "WhatsApp", icone: "MessageCircle", placeholder: "11 97393-3648", cor: "#25D366" },
  link: { label: "Link", icone: "Link", placeholder: "https://seusite.com.br", cor: "#5B3DF5" },
  instagram: { label: "Instagram", icone: "Instagram", placeholder: "@seuperfil", cor: "#E1306C" },
  facebook: { label: "Facebook", icone: "Facebook", placeholder: "sua.pagina", cor: "#1877F2" },
  tiktok: { label: "TikTok", icone: "Music2", placeholder: "@seuperfil", cor: "#000000" },
  youtube: { label: "YouTube", icone: "Youtube", placeholder: "@seucanal", cor: "#FF0000" },
  maps: { label: "Como chegar", icone: "MapPin", placeholder: "Rua, número, cidade", cor: "#EA4335" },
  phone: { label: "Telefone", icone: "Phone", placeholder: "11 3333-4444", cor: "#0EA5E9" },
  email: { label: "E-mail", icone: "Mail", placeholder: "contato@empresa.com.br", cor: "#F59E0B" },
  catalog: { label: "Catálogo", icone: "BookOpen", placeholder: "https://catalogo...", cor: "#7C3AED" },
  product: { label: "Produto", icone: "ShoppingBag", placeholder: "https://... (opcional)", cor: "#DB2777" },
  service: { label: "Serviço", icone: "Wrench", placeholder: "https://... (opcional)", cor: "#0891B2" },
  form: { label: "Formulário de contato", icone: "ClipboardList", placeholder: "", cor: "#5B3DF5" },
};

/** Ordem em que os tipos aparecem no seletor. WhatsApp primeiro, de propósito. */
export const ORDEM_TIPOS: LinkType[] = [
  "whatsapp", "form", "link", "instagram", "facebook", "tiktok", "youtube",
  "maps", "phone", "email", "catalog", "product", "service",
];

// --- Telefone --------------------------------------------------------------

/**
 * Reduz o telefone a dígitos e completa o DDI do Brasil.
 *
 * O usuário digita de tudo: "(11) 97393-3648", "11973933648", "+55 11...".
 * O WhatsApp só aceita dígitos com DDI. As regras:
 *   10 ou 11 dígitos  → número nacional, prefixa 55
 *   12 ou 13 dígitos  → já veio com DDI
 * Qualquer outro tamanho volta só os dígitos, e a validação avisa.
 */
export function normalizarTelefone(bruto: string): string {
  const d = bruto.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return d;
}

export function telefoneValido(bruto: string): boolean {
  const d = normalizarTelefone(bruto);
  return d.length === 12 || d.length === 13;
}

/** "5511973933648" → "+55 11 97393-3648", para mostrar na tela. */
export function formatarTelefone(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  if (d.length < 12) return digitos;
  const ddd = d.slice(2, 4);
  const resto = d.slice(4);
  const meio = resto.length === 9 ? `${resto.slice(0, 5)}-${resto.slice(5)}` : `${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `+55 ${ddd} ${meio}`;
}

// --- Montagem da URL -------------------------------------------------------

/**
 * Gera o link do WhatsApp com mensagem já digitada.
 *
 * Usa wa.me, que é o endereço oficial e abre o app no celular e o WhatsApp Web
 * no desktop, sem precisar detectar dispositivo.
 */
export function linkWhatsapp(numero: string, mensagem?: string): string {
  const d = normalizarTelefone(numero);
  const base = `https://wa.me/${d}`;
  const texto = mensagem?.trim();
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/** Garante http(s) na frente do que o usuário colou sem protocolo. */
function comProtocolo(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (/^(mailto|tel):/i.test(u)) return u;
  return `https://${u}`;
}

/** Tira @ e barra do começo do que o usuário digitou como usuário de rede. */
function usuario(bruto: string): string {
  return bruto.trim().replace(/^@/, "").replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Monta a URL final do botão a partir do tipo e do que o usuário informou.
 *
 * Aceita tanto o formato curto ("@perfil") quanto a URL completa colada — quem
 * já tem o link na mão não deveria precisar recortar nada.
 */
export function montarUrl(tipo: LinkType, entrada: string, config: LinkConfig = {}): string {
  const bruto = entrada.trim();

  switch (tipo) {
    case "whatsapp":
      return linkWhatsapp(config.numero ?? bruto, config.mensagem);

    case "instagram":
      if (/^https?:\/\//i.test(bruto)) return bruto;
      return `https://instagram.com/${usuario(bruto)}`;

    case "facebook":
      if (/^https?:\/\//i.test(bruto)) return bruto;
      return `https://facebook.com/${usuario(bruto)}`;

    case "tiktok":
      if (/^https?:\/\//i.test(bruto)) return bruto;
      return `https://tiktok.com/@${usuario(bruto)}`;

    case "youtube":
      if (/^https?:\/\//i.test(bruto)) return bruto;
      return `https://youtube.com/@${usuario(bruto)}`;

    case "maps":
      if (/^https?:\/\//i.test(bruto)) return bruto;
      // Endereço digitado vira busca no Maps — resolve melhor que coordenada,
      // que o dono do negócio quase nunca tem à mão.
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bruto)}`;

    case "phone":
      return `tel:+${normalizarTelefone(bruto)}`;

    case "email":
      return bruto.startsWith("mailto:") ? bruto : `mailto:${bruto}`;

    case "form":
      // O formulário não navega pra lugar nenhum: ele abre na própria página.
      return "";

    default:
      return comProtocolo(bruto);
  }
}

/** Mensagem sugerida quando o usuário cria um botão de WhatsApp. */
export const MENSAGEM_PADRAO = "Olá, gostaria de saber mais sobre seus produtos.";
