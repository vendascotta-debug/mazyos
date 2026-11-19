import { q, uid } from "@/lib/db";
import type { PublicRecords } from "@/lib/decisores";

// ---------------------------------------------------------------------------
// LGPD — pedidos de titulares e supressão de nomes.
//
// O pedido entra como "recebido". Um admin confere e aprova em
// /admin/privacidade; só então o nome some do quadro societário e das menções
// exibidas (busca, ficha, leads, exportação). Supressão por nome normalizado,
// restrita ao CNPJ quando o titular informa um. Prazo da LGPD: 15 dias.
// ---------------------------------------------------------------------------

export const normalizarNome = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();

const soDigitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

type Supressoes = { global: Set<string>; porCnpj: Map<string, Set<string>>; em: number };

declare global {
  // eslint-disable-next-line no-var
  var __prospectaSupressoes: Supressoes | undefined;
}

/** Carrega (com cache de 5 min por instância) a lista de nomes suprimidos. */
export async function carregarSupressoes(forcar = false): Promise<void> {
  const atual = globalThis.__prospectaSupressoes;
  if (!forcar && atual && Date.now() - atual.em < 5 * 60_000) return;
  const rows = await q<{ name_norm: string; cnpj: string | null }>(
    "SELECT name_norm, cnpj FROM privacy_suppressions",
  );
  const s: Supressoes = { global: new Set(), porCnpj: new Map(), em: Date.now() };
  for (const r of rows) {
    if (r.cnpj) {
      const set = s.porCnpj.get(r.cnpj) ?? new Set<string>();
      set.add(r.name_norm);
      s.porCnpj.set(r.cnpj, set);
    } else s.global.add(r.name_norm);
  }
  globalThis.__prospectaSupressoes = s;
}

/** Tira dos registros públicos as pessoas que pediram remoção. Síncrono: usa o cache. */
export function aplicarSupressoes(records: PublicRecords, cnpj: string | null | undefined): PublicRecords {
  const s = globalThis.__prospectaSupressoes;
  if (!s || (!s.global.size && !s.porCnpj.size)) return records;
  const local = s.porCnpj.get(soDigitos(cnpj));
  const bloqueado = (nome: string | null | undefined) => {
    if (!nome) return false;
    const n = normalizarNome(nome);
    return s.global.has(n) || !!local?.has(n);
  };
  return {
    ...records,
    qsa: records.qsa.filter((x) => !bloqueado(x.nome)),
    mentions: records.mentions.filter((m) => !bloqueado(m.nome)),
  };
}

export type TipoPedido = "remocao" | "acesso" | "correcao" | "outro";

export async function registrarPedido(p: {
  tipo: TipoPedido;
  nome: string;
  email: string;
  cnpj: string | null;
  mensagem: string | null;
  ip: string;
}): Promise<{ id: string }> {
  const id = uid("lgpd-");
  const cnpj = soDigitos(p.cnpj);
  // Nada é aplicado aqui: o formulário é público e não prova que quem pede é o
  // titular. Sem essa conferência, qualquer um (até um concorrente) poderia
  // apagar sócios da base. O pedido fica "recebido" até um admin aprovar.
  await q(
    "INSERT INTO privacy_requests (id, kind, name, email, cnpj, message, ip) VALUES (?,?,?,?,?,?,?)",
    [id, p.tipo, p.nome.trim(), p.email.trim().toLowerCase(), cnpj.length === 14 ? cnpj : null, p.mensagem, p.ip],
  );
  return { id };
}

/** Sem acento, maiúsculas — a mesma forma de `normalizarNome`, em SQL. */
// Acentos em maiúscula E minúscula: com collation C, o UPPER do Postgres não
// converte "é" em "É", então os dois lados entram no translate.
const SQL_SEM_ACENTO = (col: string) =>
  `UPPER(translate(${col}, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ', 'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'))`;

/**
 * Admin aprovou um pedido de remoção: o nome some da busca, ficha, leads e
 * exportação. Com CNPJ, só naquela empresa; sem CNPJ, em toda a base.
 */
export async function aprovarRemocao(id: string): Promise<{ ok: boolean; erro?: string }> {
  const pedido = (await q<{ kind: string; name: string; cnpj: string | null; status: string }>(
    "SELECT kind, name, cnpj, status FROM privacy_requests WHERE id = ?",
    [id],
  ))[0];
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (pedido.kind !== "remocao") return { ok: false, erro: "Só pedidos de remoção podem ser aprovados." };
  if (pedido.status === "aprovado") return { ok: true }; // já aprovado: não duplica

  const nome = normalizarNome(pedido.name);
  const cnpj = soDigitos(pedido.cnpj);
  await q(
    "INSERT INTO privacy_suppressions (id, name_norm, cnpj, request_id) VALUES (?,?,?,?)",
    [uid("sup-"), nome, cnpj.length === 14 ? cnpj : null, id],
  );
  await q("UPDATE privacy_requests SET status = 'aprovado' WHERE id = ?", [id]);

  // O score gravado conta "tem decisor com nome": as empresas afetadas são
  // recalculadas na próxima busca. Comparação sem acento dos dois lados.
  const palavras = nome.split(" ").filter((w) => w.length >= 3);
  if (palavras.length) {
    const cond = palavras.map(() => `${SQL_SEM_ACENTO("public_records")} LIKE ?`).join(" AND ");
    const params: unknown[] = palavras.map((w) => `%${w}%`);
    let sql = `UPDATE companies SET rank_version = NULL WHERE ${cond}`;
    if (cnpj.length === 14) {
      sql += " AND regexp_replace(cnpj, '\\D', '', 'g') = ?";
      params.push(cnpj);
    }
    await q(sql, params);
  }
  await carregarSupressoes(true);
  return { ok: true };
}

/** Desfaz uma aprovação (pedido falso descoberto depois). */
export async function desfazerRemocao(id: string) {
  await q("DELETE FROM privacy_suppressions WHERE request_id = ?", [id]);
  await q("UPDATE privacy_requests SET status = 'recusado' WHERE id = ?", [id]);
  await carregarSupressoes(true);
}
