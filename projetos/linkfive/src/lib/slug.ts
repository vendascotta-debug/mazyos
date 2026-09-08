// ---------------------------------------------------------------------------
// Regras do slug — o pedaço mais frágil da arquitetura.
//
// A página pública vive na raiz (linkfive.com.br/alessandro), o que é ótimo
// pro produto e perigoso pro sistema: quem registrasse o slug "entrar"
// sequestraria a tela de login. Toda criação e troca de slug passa por aqui.
// ---------------------------------------------------------------------------

/**
 * Slugs que a aplicação precisa pra si.
 *
 * Inclui rotas que ainda não existem (blog, ajuda, precos) de propósito: é
 * barato reservar agora e impossível tomar de volta depois que um usuário
 * registrou. Também inclui nomes que confundiriam o visitante mesmo sem rota
 * (admin, suporte, oficial).
 */
export const SLUGS_RESERVADOS = new Set([
  // rotas reais
  "app", "admin", "api", "entrar", "cadastrar", "recuperar", "redefinir",
  "onboarding",
  // "w" é o prefixo dos links curtos diretos (/w/abc123). Se alguém tomasse
  // esse slug, a página dele engoliria todos os links de WhatsApp do sistema.
  "w",
  // rotas prováveis
  "sobre", "precos", "preco", "planos", "termos", "privacidade", "ajuda",
  "suporte", "blog", "contato", "docs", "status", "afiliados",
  // sinônimos que o usuário poderia tentar
  "login", "signin", "signup", "register", "logout", "sair", "dashboard",
  "painel", "conta", "config", "configuracoes", "perfil",
  // infraestrutura e arquivos servidos na raiz
  "www", "assets", "static", "public", "_next", "favicon.ico", "robots.txt",
  "sitemap.xml", "manifest.json", "opengraph-image", "icon",
  // identidade da marca — ninguém se passa por oficial
  "linkfive", "linkfive-oficial", "oficial", "equipe", "time",
]);

/** Menor e maior tamanho aceitos. 3 evita brigas por slug de 1 letra. */
export const SLUG_MIN = 3;
export const SLUG_MAX = 30;

/**
 * Normaliza o que o usuário digitou: tira acento, troca espaço por hífen,
 * remove o que não for `a-z0-9-` e limpa hífens sobrando.
 *
 * Roda no front enquanto ele digita e no servidor antes de gravar — nunca
 * confiamos só no front.
 */
export function normalizarSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // marcas de acento separadas pelo NFD
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);
}

/**
 * Diz se o slug pode ser usado. Devolve a mensagem em português pronta pra
 * tela — a validação e o texto do erro moram juntos pra não divergirem.
 */
export function validarSlug(slug: string): { ok: true } | { ok: false; erro: string } {
  if (!slug) return { ok: false, erro: "Escolha um endereço para sua página." };
  if (slug.length < SLUG_MIN) {
    return { ok: false, erro: `O endereço precisa ter pelo menos ${SLUG_MIN} caracteres.` };
  }
  if (slug.length > SLUG_MAX) {
    return { ok: false, erro: `O endereço pode ter no máximo ${SLUG_MAX} caracteres.` };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false, erro: "Use apenas letras minúsculas, números e hífen." };
  }
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return { ok: false, erro: "O endereço não pode começar nem terminar com hífen." };
  }
  if (slug.includes("--")) {
    return { ok: false, erro: "O endereço não pode ter dois hifens seguidos." };
  }
  if (SLUGS_RESERVADOS.has(slug)) {
    return { ok: false, erro: "Esse endereço é reservado pelo sistema. Escolha outro." };
  }
  return { ok: true };
}

/** Sugere alternativas quando o slug escolhido já está em uso. */
export function sugerirSlugs(base: string): string[] {
  const b = normalizarSlug(base) || "minha-pagina";
  const corte = b.slice(0, SLUG_MAX - 4);
  return [`${corte}br`, `${corte}-oficial`.slice(0, SLUG_MAX), `${corte}${new Date().getFullYear() % 100}`];
}
