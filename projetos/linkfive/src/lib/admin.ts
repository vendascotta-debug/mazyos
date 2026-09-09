import { nowIso, q, q1 } from "@/lib/db";
import type { PlanId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Painel administrativo.
//
// Quem é admin: quem tem role='admin' no banco. O primeiro admin nasce da
// variável de ambiente ADMIN_EMAILS — senão haveria o problema do ovo e da
// galinha (precisa ser admin pra promover alguém a admin).
//
// A variável não substitui o banco: ela SINCRONIZA o papel no cadastro e no
// login, e o painel funciona já na primeira entrada.
//
// A sincronização só PROMOVE. Tirar um e-mail da variável não rebaixa ninguém:
// quem já é admin continua admin até outro admin rebaixar pelo painel. É de
// propósito — perder o acesso ao painel por causa de uma variável editada
// errado seria pior que o contrário.
// ---------------------------------------------------------------------------

/** E-mails que viram admin automaticamente. Separados por vírgula. */
export function emailsAdmin(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function ehAdminPorEmail(email: string): boolean {
  return emailsAdmin().includes(email.toLowerCase().trim());
}

/**
 * Alinha o papel do usuário à variável de ambiente.
 *
 * Roda no login e no cadastro, não a cada requisição: seria uma escrita no
 * banco em toda visita, e o papel muda uma vez na vida.
 */
export async function sincronizarPapel(userId: string, email: string, papelAtual: string) {
  const deveria = ehAdminPorEmail(email) ? "admin" : papelAtual;
  if (deveria !== papelAtual) {
    await q("UPDATE users SET role = ? WHERE id = ?", [deveria, userId]);
    return deveria;
  }
  return papelAtual;
}

// --- Números gerais --------------------------------------------------------

export interface Indicadores {
  usuarios: number;
  usuariosNovos7d: number;
  paginas: number;
  paginasPublicadas: number;
  links: number;
  curtos: number;
  views: number;
  cliques: number;
  cliquesCurtos: number;
  leads: number;
  porPlano: Record<PlanId, number>;
  pagantes: number;
  cortesias: number;
}

export async function indicadores(): Promise<Indicadores> {
  const um = async (sql: string, params: unknown[] = []) => {
    const r = await q1<{ n: string }>(sql, params);
    return Number(r?.n ?? 0);
  };

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const planos = await q<{ plan: string; n: string }>(
    "SELECT plan, COUNT(*) AS n FROM users GROUP BY plan",
  );
  const porPlano: Record<PlanId, number> = { free: 0, starter: 0, pro: 0, cortesia: 0 };
  for (const p of planos) {
    // "business" saiu da tabela mas pode existir no banco: soma no Pro, que o
    // absorveu, em vez de sumir da contagem.
    const chave = p.plan === "business" ? "pro" : (p.plan as PlanId);
    if (chave in porPlano) porPlano[chave] += Number(p.n);
  }

  return {
    usuarios: await um("SELECT COUNT(*) AS n FROM users"),
    usuariosNovos7d: await um("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?", [
      seteDiasAtras,
    ]),
    paginas: await um("SELECT COUNT(*) AS n FROM pages"),
    paginasPublicadas: await um("SELECT COUNT(*) AS n FROM pages WHERE published = 1"),
    links: await um("SELECT COUNT(*) AS n FROM links"),
    curtos: await um("SELECT COUNT(*) AS n FROM short_links"),
    views: await um("SELECT COUNT(*) AS n FROM page_views"),
    cliques: await um("SELECT COUNT(*) AS n FROM link_clicks"),
    cliquesCurtos: await um("SELECT COUNT(*) AS n FROM short_clicks"),
    leads: await um("SELECT COUNT(*) AS n FROM leads"),
    porPlano,
    // Cortesia fica de fora: é acesso concedido, não receita.
    pagantes: porPlano.starter + porPlano.pro,
    cortesias: porPlano.cortesia,
  };
}

// --- Lista de clientes -----------------------------------------------------

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  plano: PlanId;
  papel: string;
  criadoEm: string;
  slug: string | null;
  publicada: boolean;
  /** A PÁGINA está fora do ar para o visitante. */
  suspensa: boolean;
  /** A CONTA está pausada: o dono não consegue entrar. */
  pausada: boolean;
  pageId: string | null;
  links: number;
  curtos: number;
  views: number;
  cliques: number;
  leads: number;
  /** Data do último sinal de vida — visualização ou clique. */
  ultimaAtividade: string | null;
}

/**
 * A lista de clientes, com o movimento de cada um.
 *
 * Uma query só, com subselects: a alternativa seria buscar os usuários e depois
 * uma consulta por linha, o que multiplica as idas ao banco pelo número de
 * clientes — o clássico problema N+1, que só aparece quando a base cresce.
 *
 * ATENÇÃO aos apelidos com prefixo n_. O qualify() do db.ts é textual e troca
 * TODA ocorrência de um nome de tabela por schema.tabela — inclusive dentro de
 * um `AS links`, que viraria `AS linkfive.links` e quebraria o SQL. Apelido de
 * coluna nunca pode ter nome de tabela.
 */
/** Recortes que os cards da visão geral abrem. */
export type FiltroCliente = "pagantes" | "cortesia" | "publicadas" | "com-leads" | "pausadas";

const RECORTES: Record<FiltroCliente, string> = {
  // "Pagante" é quem está num plano vendido — Cortesia não conta, porque não
  // entrou dinheiro nenhum por ela.
  pagantes: "u.plan IN ('starter','pro','business')",
  cortesia: "u.plan = 'cortesia'",
  publicadas: "p.published = 1",
  "com-leads": "EXISTS (SELECT 1 FROM leads l WHERE l.page_id = p.id)",
  pausadas: "u.suspenso_em IS NOT NULL",
};

export async function clientes(
  busca = "",
  limite = 200,
  filtro?: FiltroCliente,
): Promise<Cliente[]> {
  const termo = `%${busca.trim().toLowerCase()}%`;

  const condicoes: string[] = [];
  const params: unknown[] = [];

  if (busca.trim()) {
    condicoes.push("(LOWER(u.email) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(COALESCE(p.slug,'')) LIKE ?)");
    params.push(termo, termo, termo);
  }
  if (filtro && RECORTES[filtro]) condicoes.push(RECORTES[filtro]);

  const clausula = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

  const rows = await q<{
    id: string;
    name: string;
    email: string;
    plan: string;
    role: string;
    created_at: string;
    slug: string | null;
    page_id: string | null;
    published: number | null;
    suspended: number | null;
    suspenso_em: string | null;
    n_links: string;
    n_curtos: string;
    n_views: string;
    n_cliques: string;
    n_leads: string;
    ultima: string | null;
  }>(
    `SELECT u.id, u.name, u.email, u.plan, u.role, u.created_at, u.suspenso_em,
            p.id AS page_id, p.slug, p.published, p.suspended,
            (SELECT COUNT(*) FROM links l WHERE l.page_id = p.id) AS n_links,
            (SELECT COUNT(*) FROM short_links s WHERE s.user_id = u.id) AS n_curtos,
            (SELECT COUNT(*) FROM page_views v WHERE v.page_id = p.id) AS n_views,
            (SELECT COUNT(*) FROM link_clicks c WHERE c.page_id = p.id) AS n_cliques,
            (SELECT COUNT(*) FROM leads d WHERE d.page_id = p.id) AS n_leads,
            (SELECT MAX(v2.created_at) FROM page_views v2 WHERE v2.page_id = p.id) AS ultima
       FROM users u
       LEFT JOIN pages p ON p.user_id = u.id
       ${clausula}
      ORDER BY u.created_at DESC
      LIMIT ${Number(limite)}`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    nome: r.name,
    email: r.email,
    plano: (r.plan as PlanId) ?? "free",
    papel: r.role,
    criadoEm: r.created_at,
    slug: r.slug,
    pageId: r.page_id,
    publicada: Boolean(r.published),
    suspensa: Boolean(r.suspended),
    pausada: Boolean(r.suspenso_em),
    links: Number(r.n_links),
    curtos: Number(r.n_curtos),
    views: Number(r.n_views),
    cliques: Number(r.n_cliques),
    leads: Number(r.n_leads),
    ultimaAtividade: r.ultima,
  }));
}

// --- Ações do admin --------------------------------------------------------

// O Cortesia entra aqui de propósito: é justamente o plano que só existe
// para o admin conceder, e esta é a única porta por onde ele pode ser dado.
const PLANOS_VALIDOS: PlanId[] = ["free", "starter", "pro", "cortesia"];

export async function definirPlano(userId: string, plano: string): Promise<boolean> {
  if (!PLANOS_VALIDOS.includes(plano as PlanId)) return false;
  await q("UPDATE users SET plan = ? WHERE id = ?", [plano, userId]);
  return true;
}

export async function definirPapel(userId: string, papel: string): Promise<boolean> {
  if (papel !== "admin" && papel !== "user") return false;
  await q("UPDATE users SET role = ? WHERE id = ?", [papel, userId]);
  return true;
}

/**
 * Suspende a página: ela sai do ar imediatamente, sem apagar nada.
 *
 * É a resposta a abuso — alguém hospedando phishing numa página LINKFIVE. O
 * dono continua com os dados e pode recorrer; ninguém perde trabalho por um
 * engano do moderador.
 */
/**
 * Pausa ou libera a conta inteira.
 *
 * Diferente de suspender a página: a página suspensa some para o visitante; a
 * conta pausada impede o dono de entrar. Vale na requisição seguinte, porque a
 * checagem mora no `currentUser`, não só no login.
 */
export async function pausarConta(userId: string, pausar: boolean): Promise<void> {
  await q("UPDATE users SET suspenso_em = ? WHERE id = ?", [pausar ? nowIso() : null, userId]);
}

/**
 * Apaga a conta e tudo que pende dela.
 *
 * Página, links, métricas e leads somem junto, por cascata — é o que a pessoa
 * espera de "excluir".
 *
 * O QUE NÃO SOME: o histórico de pagamento. As assinaturas são soltas do
 * usuário antes da exclusão, e sobrevivem ancoradas no e-mail. Apagar registro
 * de dinheiro recebido junto com a conta seria perder a contabilidade — e se a
 * mesma pessoa voltar com o mesmo e-mail, o que ela pagou continua lá.
 */
export async function excluirConta(userId: string): Promise<void> {
  await q("UPDATE subscriptions SET user_id = NULL WHERE user_id = ?", [userId]);
  await q("DELETE FROM users WHERE id = ?", [userId]);
}

export async function suspenderPagina(pageId: string, suspensa: boolean): Promise<void> {
  await q("UPDATE pages SET suspended = ? WHERE id = ?", [suspensa ? 1 : 0, pageId]);
}
