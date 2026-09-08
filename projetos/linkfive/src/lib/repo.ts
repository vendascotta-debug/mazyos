import { nowIso, q, q1, today, uid } from "@/lib/db";
import type { DailyStat, Lead, LinkConfig, LinkType, Page, PageLink } from "@/lib/types";
import type { ShortLink } from "@/lib/curtos";

// ---------------------------------------------------------------------------
// Acesso a dados.
//
// REGRA INEGOCIÁVEL: toda função que toca dado privado recebe `userId` como
// PRIMEIRO argumento e o usa na cláusula WHERE. Nenhuma rota monta SQL na mão.
//
// O motivo é simples: a aplicação conecta no Postgres com um único usuário de
// banco, então não existe RLS pra salvar ninguém. Se o `user_id` sumir de um
// WHERE, um cliente vê o lead do outro. As funções abaixo são a única barreira,
// e por isso a assinatura delas obriga a passar o dono.
//
// As funções de leitura pública (página do visitante) são a exceção explícita e
// estão agrupadas no fim, sob um cabeçalho próprio.
// ---------------------------------------------------------------------------

// --- Conversão de linha ----------------------------------------------------

interface PageRow {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  bio: string | null;
  avatar_url: string | null;
  theme_id: string;
  theme_overrides: string;
  published: number;
  suspended: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

/** JSON guardado como TEXT: um valor corrompido não pode derrubar a página. */
function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toPage(r: PageRow): Page {
  return {
    id: r.id,
    userId: r.user_id,
    slug: r.slug,
    title: r.title,
    bio: r.bio,
    avatarUrl: r.avatar_url,
    themeId: r.theme_id,
    themeOverrides: parseJson<Record<string, string>>(r.theme_overrides, {}),
    published: Boolean(r.published),
    suspended: Boolean(r.suspended),
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface LinkRow {
  id: string;
  page_id: string;
  type: string;
  title: string;
  url: string;
  icon: string | null;
  config: string;
  position: number;
  active: number;
  created_at: string;
}

function toLink(r: LinkRow): PageLink {
  return {
    id: r.id,
    pageId: r.page_id,
    type: r.type as LinkType,
    title: r.title,
    url: r.url,
    icon: r.icon,
    config: parseJson<LinkConfig>(r.config, {}),
    position: r.position,
    active: Boolean(r.active),
    createdAt: r.created_at,
  };
}

// --- Páginas ---------------------------------------------------------------

export async function slugDisponivel(slug: string): Promise<boolean> {
  const r = await q1("SELECT 1 AS x FROM pages WHERE slug = ?", [slug]);
  return !r;
}

export async function criarPagina(userId: string, slug: string, title: string): Promise<Page> {
  const id = uid("p_");
  const agora = nowIso();
  await q(
    `INSERT INTO pages (id, user_id, slug, title, theme_id, theme_overrides,
                        published, suspended, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'clean', '{}', 0, 0, ?, ?)`,
    [id, userId, slug, title, agora, agora],
  );
  const row = await q1<PageRow>("SELECT * FROM pages WHERE id = ?", [id]);
  return toPage(row!);
}

/** A página do usuário. No MVP é uma só; a query já ordena pra virar lista. */
export async function paginaDoUsuario(userId: string): Promise<Page | null> {
  const row = await q1<PageRow>(
    "SELECT * FROM pages WHERE user_id = ? ORDER BY created_at LIMIT 1",
    [userId],
  );
  return row ? toPage(row) : null;
}

export async function paginasDoUsuario(userId: string): Promise<Page[]> {
  const rows = await q<PageRow>("SELECT * FROM pages WHERE user_id = ? ORDER BY created_at", [
    userId,
  ]);
  return rows.map(toPage);
}

export async function contarPaginas(userId: string): Promise<number> {
  const r = await q1<{ n: string }>("SELECT COUNT(*) AS n FROM pages WHERE user_id = ?", [userId]);
  return Number(r?.n ?? 0);
}

/**
 * Busca a página garantindo que ela é do usuário. Devolve null se for de outro
 * — nunca lança, pra rota poder responder 404 em vez de vazar que existe.
 */
export async function paginaDoDono(userId: string, pageId: string): Promise<Page | null> {
  const row = await q1<PageRow>("SELECT * FROM pages WHERE id = ? AND user_id = ?", [
    pageId,
    userId,
  ]);
  return row ? toPage(row) : null;
}

export type CamposPagina = Partial<
  Pick<Page, "title" | "bio" | "avatarUrl" | "themeId" | "seoTitle" | "seoDescription">
> & { themeOverrides?: Record<string, string> };

export async function atualizarPagina(
  userId: string,
  pageId: string,
  campos: CamposPagina,
): Promise<Page | null> {
  const dono = await paginaDoDono(userId, pageId);
  if (!dono) return null;

  // Monta o UPDATE só com o que veio — assim um PATCH parcial não apaga campo
  // que o formulário não enviou.
  const sets: string[] = [];
  const vals: unknown[] = [];
  const mapa: Record<string, unknown> = {
    title: campos.title,
    bio: campos.bio,
    avatar_url: campos.avatarUrl,
    theme_id: campos.themeId,
    seo_title: campos.seoTitle,
    seo_description: campos.seoDescription,
    theme_overrides: campos.themeOverrides ? JSON.stringify(campos.themeOverrides) : undefined,
  };
  for (const [col, val] of Object.entries(mapa)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(val);
    }
  }
  if (!sets.length) return dono;

  sets.push("updated_at = ?");
  vals.push(nowIso(), pageId, userId);
  await q(`UPDATE pages SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, vals);
  return paginaDoDono(userId, pageId);
}

export async function publicarPagina(
  userId: string,
  pageId: string,
  publicar: boolean,
): Promise<boolean> {
  const r = await q("UPDATE pages SET published = ?, updated_at = ? WHERE id = ? AND user_id = ?", [
    publicar ? 1 : 0,
    nowIso(),
    pageId,
    userId,
  ]);
  return Array.isArray(r);
}

export async function trocarSlug(userId: string, pageId: string, slug: string): Promise<boolean> {
  if (!(await slugDisponivel(slug))) return false;
  await q("UPDATE pages SET slug = ?, updated_at = ? WHERE id = ? AND user_id = ?", [
    slug,
    nowIso(),
    pageId,
    userId,
  ]);
  return true;
}

// --- Links -----------------------------------------------------------------

export async function linksDaPagina(userId: string, pageId: string): Promise<PageLink[]> {
  // O JOIN com pages é o que amarra o link ao dono: sem ele, bastaria adivinhar
  // um pageId pra listar os links de outra conta.
  const rows = await q<LinkRow>(
    `SELECT links.* FROM links
       JOIN pages ON pages.id = links.page_id
      WHERE links.page_id = ? AND pages.user_id = ?
      ORDER BY links.position, links.created_at`,
    [pageId, userId],
  );
  return rows.map(toLink);
}

export async function contarLinks(userId: string, pageId: string): Promise<number> {
  const r = await q1<{ n: string }>(
    `SELECT COUNT(*) AS n FROM links
       JOIN pages ON pages.id = links.page_id
      WHERE links.page_id = ? AND pages.user_id = ?`,
    [pageId, userId],
  );
  return Number(r?.n ?? 0);
}

export interface NovoLink {
  type: LinkType;
  title: string;
  url?: string;
  icon?: string | null;
  config?: LinkConfig;
}

export async function criarLink(
  userId: string,
  pageId: string,
  dados: NovoLink,
): Promise<PageLink | null> {
  if (!(await paginaDoDono(userId, pageId))) return null;

  const r = await q1<{ n: number | null }>(
    "SELECT MAX(position) AS n FROM links WHERE page_id = ?",
    [pageId],
  );
  const position = Number(r?.n ?? -1) + 1;

  const id = uid("l_");
  await q(
    `INSERT INTO links (id, page_id, type, title, url, icon, config, position, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      pageId,
      dados.type,
      dados.title,
      dados.url ?? "",
      dados.icon ?? null,
      JSON.stringify(dados.config ?? {}),
      position,
      nowIso(),
    ],
  );
  const row = await q1<LinkRow>("SELECT * FROM links WHERE id = ?", [id]);
  return row ? toLink(row) : null;
}

export type CamposLink = Partial<Pick<PageLink, "title" | "url" | "icon" | "active">> & {
  config?: LinkConfig;
};

export async function atualizarLink(
  userId: string,
  linkId: string,
  campos: CamposLink,
): Promise<PageLink | null> {
  const atual = await linkDoDono(userId, linkId);
  if (!atual) return null;

  const sets: string[] = [];
  const vals: unknown[] = [];
  const mapa: Record<string, unknown> = {
    title: campos.title,
    url: campos.url,
    icon: campos.icon,
    active: campos.active === undefined ? undefined : campos.active ? 1 : 0,
    config: campos.config ? JSON.stringify(campos.config) : undefined,
  };
  for (const [col, val] of Object.entries(mapa)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(val);
    }
  }
  if (!sets.length) return atual;

  vals.push(linkId);
  await q(`UPDATE links SET ${sets.join(", ")} WHERE id = ?`, vals);
  return linkDoDono(userId, linkId);
}

/** Link + confirmação de dono, via JOIN. Null se pertencer a outra conta. */
export async function linkDoDono(userId: string, linkId: string): Promise<PageLink | null> {
  const row = await q1<LinkRow>(
    `SELECT links.* FROM links
       JOIN pages ON pages.id = links.page_id
      WHERE links.id = ? AND pages.user_id = ?`,
    [linkId, userId],
  );
  return row ? toLink(row) : null;
}

export async function excluirLink(userId: string, linkId: string): Promise<boolean> {
  if (!(await linkDoDono(userId, linkId))) return false;
  await q("DELETE FROM links WHERE id = ?", [linkId]);
  return true;
}

/**
 * Grava a ordem nova depois de um arrastar-e-soltar.
 *
 * Recebe a lista inteira de ids na ordem final e regrava a posição de cada um.
 * Só mexe nos links que são mesmo do usuário — um id estranho no meio da lista
 * é ignorado, não derruba a operação inteira.
 */
export async function reordenarLinks(
  userId: string,
  pageId: string,
  ids: string[],
): Promise<boolean> {
  if (!(await paginaDoDono(userId, pageId))) return false;
  for (let i = 0; i < ids.length; i++) {
    await q("UPDATE links SET position = ? WHERE id = ? AND page_id = ?", [i, ids[i], pageId]);
  }
  return true;
}

// --- Analytics -------------------------------------------------------------

/**
 * Soma um evento no rollup do dia.
 *
 * O UPSERT deixa a operação atômica: dois cliques simultâneos não se perdem,
 * o que aconteceria num "SELECT, soma, UPDATE" feito em duas idas ao banco.
 */
async function somarNoDia(
  pageId: string,
  campo: "views" | "clicks" | "whatsapp_clicks" | "leads_count",
): Promise<void> {
  await q(
    `INSERT INTO daily_stats (page_id, day, ${campo}) VALUES (?, ?, 1)
     ON CONFLICT (page_id, day) DO UPDATE SET ${campo} = daily_stats.${campo} + 1`,
    [pageId, today()],
  );
}

export async function registrarView(
  pageId: string,
  device: string | null,
  referrer: string | null,
  country: string | null = null,
): Promise<void> {
  await q(
    "INSERT INTO page_views (id, page_id, device, referrer, country, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [uid("v_"), pageId, device, referrer, country, nowIso()],
  );
  await somarNoDia(pageId, "views");
}

export async function registrarClique(
  linkId: string,
  pageId: string,
  tipo: string,
  device: string | null,
  referrer: string | null,
): Promise<void> {
  await q(
    `INSERT INTO link_clicks (id, link_id, page_id, device, referrer, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uid("c_"), linkId, pageId, device, referrer, nowIso()],
  );
  await somarNoDia(pageId, "clicks");
  if (tipo === "whatsapp") await somarNoDia(pageId, "whatsapp_clicks");
}

/** Série diária do rollup, já com os dias sem movimento preenchidos com zero. */
export async function serieDiaria(
  userId: string,
  pageId: string,
  dias: number,
): Promise<DailyStat[]> {
  if (!(await paginaDoDono(userId, pageId))) return [];

  const rows = await q<{
    day: string;
    views: number;
    clicks: number;
    whatsapp_clicks: number;
    leads_count: number;
  }>(
    `SELECT ds.day, ds.views, ds.clicks, ds.whatsapp_clicks, ds.leads_count
       FROM daily_stats ds
       JOIN pages ON pages.id = ds.page_id
      WHERE ds.page_id = ? AND pages.user_id = ? AND ds.day >= ?
      ORDER BY ds.day`,
    [pageId, userId, diasAtras(dias)],
  );

  // O gráfico precisa de um ponto por dia, senão uma semana parada vira uma
  // linha reta enganosa entre dois pontos distantes.
  const porDia = new Map(rows.map((r) => [r.day, r]));
  const saida: DailyStat[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const dia = diasAtras(i + 1);
    const r = porDia.get(dia);
    saida.push({
      day: dia,
      views: Number(r?.views ?? 0),
      clicks: Number(r?.clicks ?? 0),
      whatsappClicks: Number(r?.whatsapp_clicks ?? 0),
      leads: Number(r?.leads_count ?? 0),
    });
  }
  return saida;
}

/** Data de N dias atrás no formato YYYY-MM-DD (N=1 é hoje). */
function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export interface Totais {
  views: number;
  clicks: number;
  whatsappClicks: number;
  leads: number;
  /** Cliques ÷ visualizações, em porcentagem. */
  conversao: number;
}

export function somarTotais(serie: DailyStat[]): Totais {
  const t = serie.reduce(
    (acc, d) => ({
      views: acc.views + d.views,
      clicks: acc.clicks + d.clicks,
      whatsappClicks: acc.whatsappClicks + d.whatsappClicks,
      leads: acc.leads + d.leads,
    }),
    { views: 0, clicks: 0, whatsappClicks: 0, leads: 0 },
  );
  return { ...t, conversao: t.views ? Math.round((t.clicks / t.views) * 1000) / 10 : 0 };
}

/** Ranking dos links mais clicados no período. */
export async function ranking(
  userId: string,
  pageId: string,
  dias: number,
  limite = 5,
): Promise<{ id: string; title: string; type: string; cliques: number }[]> {
  if (!(await paginaDoDono(userId, pageId))) return [];
  const rows = await q<{ id: string; title: string; type: string; cliques: string }>(
    `SELECT links.id, links.title, links.type, COUNT(link_clicks.id) AS cliques
       FROM links
       JOIN pages ON pages.id = links.page_id
       LEFT JOIN link_clicks
         ON link_clicks.link_id = links.id AND link_clicks.created_at >= ?
      WHERE links.page_id = ? AND pages.user_id = ?
      GROUP BY links.id, links.title, links.type
      ORDER BY cliques DESC, links.position
      LIMIT ${Number(limite)}`,
    [diasAtras(dias), pageId, userId],
  );
  return rows.map((r) => ({ ...r, cliques: Number(r.cliques) }));
}

// --- Leads -----------------------------------------------------------------

export async function leadsDaPagina(
  userId: string,
  pageId: string,
  limite = 100,
): Promise<Lead[]> {
  const rows = await q<{
    id: string;
    page_id: string;
    link_id: string | null;
    name: string | null;
    whatsapp: string | null;
    email: string | null;
    company: string | null;
    message: string | null;
    source: string | null;
    created_at: string;
  }>(
    `SELECT leads.* FROM leads
       JOIN pages ON pages.id = leads.page_id
      WHERE leads.page_id = ? AND pages.user_id = ?
      ORDER BY leads.created_at DESC
      LIMIT ${Number(limite)}`,
    [pageId, userId],
  );
  return rows.map((r) => ({
    id: r.id,
    pageId: r.page_id,
    linkId: r.link_id,
    name: r.name,
    whatsapp: r.whatsapp,
    email: r.email,
    company: r.company,
    message: r.message,
    source: r.source,
    createdAt: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// LEITURA PÚBLICA — a exceção consciente à regra do userId.
//
// Estas funções servem o visitante da página, que não tem sessão. Por isso elas
// devolvem SÓ o que é público: nada de e-mail do dono, nada de lead, nada de
// estatística. E respeitam `published` e `suspended`.
// ---------------------------------------------------------------------------

export async function paginaPublica(slug: string): Promise<Page | null> {
  const row = await q1<PageRow>("SELECT * FROM pages WHERE slug = ?", [slug]);
  if (!row) return null;
  const page = toPage(row);
  if (page.suspended) return null;
  return page;
}

export async function linksPublicos(pageId: string): Promise<PageLink[]> {
  const rows = await q<LinkRow>(
    "SELECT * FROM links WHERE page_id = ? AND active = 1 ORDER BY position, created_at",
    [pageId],
  );
  return rows.map(toLink);
}

/** Grava o lead enviado pelo formulário da página pública. */
export async function registrarLead(
  pageId: string,
  dados: Omit<Lead, "id" | "pageId" | "createdAt">,
): Promise<void> {
  await q(
    `INSERT INTO leads (id, page_id, link_id, name, whatsapp, email, company, message, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uid("ld_"),
      pageId,
      dados.linkId,
      dados.name,
      dados.whatsapp,
      dados.email,
      dados.company,
      dados.message,
      dados.source,
      nowIso(),
    ],
  );
  await somarNoDia(pageId, "leads_count");
}

// ---------------------------------------------------------------------------
// LINKS CURTOS DIRETOS (/w/abc123)
//
// Mesma regra do resto do arquivo: tudo que é privado recebe `userId` como
// primeiro argumento. São duas as exceções, e as duas são deliberadas:
//
//   curtoPorCodigo   → o redirecionador público; devolve só o que o
//                      redirecionamento precisa.
//   criarCurtoOrfao  → o gerador da landing, usado por quem ainda não tem
//                      conta. O link nasce sem dono (`user_id IS NULL`), então
//                      não há dado privado de ninguém a proteger. Só
//                      `adotarCurtos` transforma um órfão em link de alguém, e
//                      ela recusa qualquer linha que já tenha dono.
// ---------------------------------------------------------------------------

interface ShortRow {
  id: string;
  /** `null` enquanto o link for órfão — criado na landing, sem conta. */
  user_id: string | null;
  code: string;
  tipo: string;
  title: string;
  numero: string | null;
  mensagem: string | null;
  destino: string;
  active: number;
  expira_em: string | null;
  senha_hash: string | null;
  clicks_total: number;
  created_at: string;
  updated_at: string;
}

function toShort(r: ShortRow): ShortLink {
  return {
    id: r.id,
    userId: r.user_id,
    code: r.code,
    tipo: (r.tipo === "url" ? "url" : "whatsapp") as ShortLink["tipo"],
    title: r.title,
    numero: r.numero,
    mensagem: r.mensagem,
    destino: r.destino,
    active: Boolean(r.active),
    expiraEm: r.expira_em,
    // Só o booleano sai daqui: o hash nunca vai para a tela.
    temSenha: Boolean(r.senha_hash),
    clicksTotal: Number(r.clicks_total),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function codigoDisponivel(code: string): Promise<boolean> {
  const r = await q1("SELECT 1 AS x FROM short_links WHERE LOWER(code) = LOWER(?)", [code]);
  return !r;
}

export async function curtosDoUsuario(userId: string): Promise<ShortLink[]> {
  const rows = await q<ShortRow>(
    "SELECT * FROM short_links WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
  return rows.map(toShort);
}

export async function contarCurtos(userId: string): Promise<number> {
  const r = await q1<{ n: string }>(
    "SELECT COUNT(*) AS n FROM short_links WHERE user_id = ?",
    [userId],
  );
  return Number(r?.n ?? 0);
}

export async function curtoDoDono(userId: string, id: string): Promise<ShortLink | null> {
  const row = await q1<ShortRow>("SELECT * FROM short_links WHERE id = ? AND user_id = ?", [
    id,
    userId,
  ]);
  return row ? toShort(row) : null;
}

export async function criarCurto(
  userId: string,
  dados: {
    code: string;
    tipo: ShortLink["tipo"];
    title: string;
    numero: string | null;
    mensagem: string | null;
    destino: string;
  },
): Promise<ShortLink | null> {
  const id = uid("s_");
  const agora = nowIso();
  await q(
    `INSERT INTO short_links (id, user_id, code, tipo, title, numero, mensagem, destino,
                              active, clicks_total, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    [id, userId, dados.code, dados.tipo, dados.title, dados.numero, dados.mensagem, dados.destino, agora, agora],
  );
  return curtoDoDono(userId, id);
}

/**
 * Link criado na landing, por quem ainda não tem conta.
 *
 * Nasce sem dono e com prazo: 30 dias. O prazo não é detalhe — sem ele o
 * gerador aberto encheria a tabela de links eternos que ninguém reivindicou, e
 * cada um deles é um endereço `linkfive.com.br` apontando para fora do nosso
 * controle. Adotar o link limpa a data.
 */
export async function criarCurtoOrfao(dados: {
  code: string;
  tipo: ShortLink["tipo"];
  title: string;
  numero: string | null;
  mensagem: string | null;
  destino: string;
  ipHash: string;
  expiraEm: string;
}): Promise<ShortLink | null> {
  const id = uid("s_");
  const agora = nowIso();
  await q(
    `INSERT INTO short_links (id, user_id, code, tipo, title, numero, mensagem, destino,
                              active, clicks_total, ip_hash, expira_em, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)`,
    [
      id, dados.code, dados.tipo, dados.title, dados.numero, dados.mensagem,
      dados.destino, dados.ipHash, dados.expiraEm, agora, agora,
    ],
  );
  const row = await q1<ShortRow>("SELECT * FROM short_links WHERE id = ?", [id]);
  return row ? toShort(row) : null;
}

/** Quantos links órfãos esse visitante criou desde `desde`. Freio de abuso. */
export async function contarOrfaosDoVisitante(ipHash: string, desde: string): Promise<number> {
  const r = await q1<{ n: string }>(
    "SELECT COUNT(*) AS n FROM short_links WHERE ip_hash = ? AND user_id IS NULL AND created_at >= ?",
    [ipHash, desde],
  );
  return Number(r?.n ?? 0);
}

/**
 * Passa para a conta os links que o visitante criou antes de se cadastrar.
 *
 * O `user_id IS NULL` na cláusula é o que impede a adoção de virar sequestro:
 * um id forjado no cookie que aponte para o link de outra pessoa não casa, e a
 * linha não é tocada. Devolve quantos foram realmente adotados.
 */
export async function adotarCurtos(userId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const marcas = ids.map(() => "?").join(", ");
  const rows = await q<{ id: string }>(
    `UPDATE short_links
        SET user_id = ?, expira_em = NULL, ip_hash = NULL, updated_at = ?
      WHERE user_id IS NULL AND id IN (${marcas})
      RETURNING id`,
    [userId, nowIso(), ...ids],
  );
  return rows.length;
}

/** Lê um órfão pelo id, para a landing mostrar o que acabou de criar. */
export async function curtoOrfaoPorId(id: string): Promise<ShortLink | null> {
  const row = await q1<ShortRow>(
    "SELECT * FROM short_links WHERE id = ? AND user_id IS NULL",
    [id],
  );
  return row ? toShort(row) : null;
}

export async function atualizarCurto(
  userId: string,
  id: string,
  campos: {
    title?: string;
    numero?: string | null;
    mensagem?: string | null;
    destino?: string;
    active?: boolean;
    expiraEm?: string | null;
    /** Hash pronto, nunca a senha em texto. */
    senhaHash?: string | null;
  },
): Promise<ShortLink | null> {
  if (!(await curtoDoDono(userId, id))) return null;

  const sets: string[] = [];
  const vals: unknown[] = [];
  const mapa: Record<string, unknown> = {
    title: campos.title,
    numero: campos.numero,
    mensagem: campos.mensagem,
    destino: campos.destino,
    active: campos.active === undefined ? undefined : campos.active ? 1 : 0,
    expira_em: campos.expiraEm,
    senha_hash: campos.senhaHash,
  };
  for (const [col, val] of Object.entries(mapa)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(val);
    }
  }
  if (!sets.length) return curtoDoDono(userId, id);

  sets.push("updated_at = ?");
  vals.push(nowIso(), id, userId);
  await q(`UPDATE short_links SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, vals);
  return curtoDoDono(userId, id);
}

export async function excluirCurto(userId: string, id: string): Promise<boolean> {
  if (!(await curtoDoDono(userId, id))) return false;
  await q("DELETE FROM short_links WHERE id = ? AND user_id = ?", [id, userId]);
  return true;
}

/**
 * Leitura pública, usada pelo redirecionador.
 *
 * Devolve só o necessário para redirecionar. Link pausado volta como null: o
 * visitante vê "link indisponível" em vez de cair numa conversa que o dono
 * desligou de propósito.
 */
export async function curtoPorCodigo(code: string): Promise<
  | { estado: "ok"; id: string; destino: string; userId: string }
  | { estado: "pedeSenha"; id: string }
  | { estado: "expirado" }
  | { estado: "inexistente" }
> {
  const row = await q1<{
    id: string;
    destino: string;
    user_id: string;
    active: number;
    expira_em: string | null;
    senha_hash: string | null;
  }>(
    "SELECT id, destino, user_id, active, expira_em, senha_hash FROM short_links WHERE LOWER(code) = LOWER(?)",
    [code],
  );

  // Link pausado e link inexistente respondem igual: quem desligou o link não
  // quer que descubram que ele existe.
  if (!row || !row.active) return { estado: "inexistente" };

  // Expirado é diferente de inexistente de propósito: o visitante veio de um
  // cartão impresso e merece saber que a promoção acabou, não que o endereço
  // está errado.
  if (row.expira_em && new Date(row.expira_em).getTime() < Date.now()) {
    return { estado: "expirado" };
  }

  if (row.senha_hash) return { estado: "pedeSenha", id: row.id };

  return { estado: "ok", id: row.id, destino: row.destino, userId: row.user_id };
}

/**
 * Confere a senha e devolve o destino.
 *
 * Só esta função enxerga o hash — nem a listagem do painel nem a API expõem
 * ele. Devolve null tanto para senha errada quanto para link inexistente: a
 * diferença entre os dois não interessa a quem está tentando adivinhar.
 */
export async function abrirCurtoComSenha(
  code: string,
  senha: string,
  verificar: (senha: string, hash: string | null) => boolean,
): Promise<{ id: string; destino: string } | null> {
  const row = await q1<{
    id: string;
    destino: string;
    active: number;
    expira_em: string | null;
    senha_hash: string | null;
  }>(
    "SELECT id, destino, active, expira_em, senha_hash FROM short_links WHERE LOWER(code) = LOWER(?)",
    [code],
  );
  if (!row || !row.active || !row.senha_hash) return null;
  if (row.expira_em && new Date(row.expira_em).getTime() < Date.now()) return null;
  if (!verificar(senha, row.senha_hash)) return null;
  return { id: row.id, destino: row.destino };
}

/**
 * Registra o clique no link curto.
 *
 * O INSERT do evento e a soma do total vão juntos: dois cliques ao mesmo tempo
 * não se perdem, o que aconteceria num "lê, soma, grava" em duas idas ao banco.
 */
export async function registrarCliqueCurto(
  shortId: string,
  device: string | null,
  referrer: string | null,
): Promise<void> {
  await q(
    "INSERT INTO short_clicks (id, short_id, device, referrer, created_at) VALUES (?, ?, ?, ?, ?)",
    [uid("sc_"), shortId, device, referrer, nowIso()],
  );
  await q("UPDATE short_links SET clicks_total = clicks_total + 1 WHERE id = ?", [shortId]);
}

/**
 * Quantos links diretos o usuário criou no mês corrente.
 *
 * A cota é por mês de calendário e zera no dia 1º — é o que a mensagem de
 * limite promete ao usuário, então precisa ser exatamente isso. Janela móvel
 * de 30 dias seria mais suave, mas ninguém entende quando a cota volta.
 *
 * O corte usa o fuso de São Paulo: virar o mês às 21h do dia 30 porque o
 * servidor está em UTC seria uma surpresa desagradável.
 */
export async function contarCurtosNoMes(userId: string): Promise<number> {
  const agora = new Date();
  const saoPaulo = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const inicioDoMes = `${saoPaulo.slice(0, 7)}-01`;

  const r = await q1<{ n: string }>(
    "SELECT COUNT(*) AS n FROM short_links WHERE user_id = ? AND created_at >= ?",
    [userId, inicioDoMes],
  );
  return Number(r?.n ?? 0);
}

// ---------------------------------------------------------------------------
// MÉTRICAS DETALHADAS
//
// Origem, dispositivo e país. Os dois primeiros já eram gravados desde o
// começo e nunca tinham sido mostrados em lugar nenhum — este bloco só traz
// para a tela o que o banco já guardava.
// ---------------------------------------------------------------------------

export interface Fatia {
  rotulo: string;
  n: number;
  pct: number;
}

function comPercentual(linhas: { rotulo: string; n: number }[]): Fatia[] {
  const total = linhas.reduce((s, l) => s + l.n, 0) || 1;
  return linhas.map((l) => ({ ...l, pct: Math.round((l.n / total) * 100) }));
}

/** Data de N dias atrás, no formato do `created_at`. */
function desdeDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

/**
 * De onde vieram as visitas.
 *
 * O referrer chega como URL inteira; o que interessa é o domínio. Sem
 * referrer significa acesso direto — alguém que digitou, escaneou o QR ou
 * tocou no link dentro de um app que não informa origem (o WhatsApp é assim).
 * Isso costuma ser a maior fatia, e chamar de "Desconhecido" confundiria.
 */
export async function rankingOrigens(
  userId: string,
  pageId: string,
  dias: number,
  limite = 8,
): Promise<Fatia[]> {
  if (!(await paginaDoDono(userId, pageId))) return [];
  const rows = await q<{ referrer: string | null; n: string }>(
    `SELECT pv.referrer, COUNT(*) AS n
       FROM page_views pv
       JOIN pages ON pages.id = pv.page_id
      WHERE pv.page_id = ? AND pages.user_id = ? AND pv.created_at >= ?
      GROUP BY pv.referrer`,
    [pageId, userId, desdeDias(dias)],
  );

  const porDominio = new Map<string, number>();
  for (const r of rows) {
    let chave = "Acesso direto";
    if (r.referrer) {
      try {
        chave = new URL(r.referrer).hostname.replace(/^www\./, "");
      } catch {
        chave = r.referrer.slice(0, 40);
      }
    }
    porDominio.set(chave, (porDominio.get(chave) ?? 0) + Number(r.n));
  }

  return comPercentual(
    [...porDominio.entries()]
      .map(([rotulo, n]) => ({ rotulo, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, limite),
  );
}

const NOME_DISPOSITIVO: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
};

export async function rankingDispositivos(
  userId: string,
  pageId: string,
  dias: number,
): Promise<Fatia[]> {
  if (!(await paginaDoDono(userId, pageId))) return [];
  const rows = await q<{ device: string | null; n: string }>(
    `SELECT pv.device, COUNT(*) AS n
       FROM page_views pv
       JOIN pages ON pages.id = pv.page_id
      WHERE pv.page_id = ? AND pages.user_id = ? AND pv.created_at >= ?
      GROUP BY pv.device
      ORDER BY n DESC`,
    [pageId, userId, desdeDias(dias)],
  );
  return comPercentual(
    rows.map((r) => ({
      rotulo: NOME_DISPOSITIVO[r.device ?? ""] ?? "Outro",
      n: Number(r.n),
    })),
  );
}

export async function rankingPaises(
  userId: string,
  pageId: string,
  dias: number,
  limite = 8,
): Promise<Fatia[]> {
  if (!(await paginaDoDono(userId, pageId))) return [];
  const rows = await q<{ country: string | null; n: string }>(
    `SELECT pv.country, COUNT(*) AS n
       FROM page_views pv
       JOIN pages ON pages.id = pv.page_id
      WHERE pv.page_id = ? AND pages.user_id = ? AND pv.created_at >= ?
      GROUP BY pv.country
      ORDER BY n DESC
      LIMIT ${Number(limite)}`,
    [pageId, userId, desdeDias(dias)],
  );
  return comPercentual(
    rows.map((r) => ({ rotulo: r.country ?? "Desconhecido", n: Number(r.n) })),
  );
}
