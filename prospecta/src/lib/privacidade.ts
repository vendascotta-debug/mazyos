import { q, uid } from "@/lib/db";
import type { PublicRecords } from "@/lib/decisores";

// ---------------------------------------------------------------------------
// LGPD — pedidos de titulares e supressão de nomes.
//
// Pedido de remoção vale na hora: o nome some do quadro societário e das
// menções exibidas (busca, ficha, leads, exportação). A supressão é por nome
// normalizado, restrita ao CNPJ quando o titular informa um. O pedido fica
// registrado para a resposta formal ao titular (prazo da LGPD: 15 dias).
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
}): Promise<{ id: string; suprimido: boolean }> {
  const id = uid("lgpd-");
  const cnpj = soDigitos(p.cnpj);
  await q(
    "INSERT INTO privacy_requests (id, kind, name, email, cnpj, message, ip) VALUES (?,?,?,?,?,?,?)",
    [id, p.tipo, p.nome.trim(), p.email.trim().toLowerCase(), cnpj.length === 14 ? cnpj : null, p.mensagem, p.ip],
  );

  if (p.tipo !== "remocao") return { id, suprimido: false };

  const nome = normalizarNome(p.nome);
  await q(
    "INSERT INTO privacy_suppressions (id, name_norm, cnpj, request_id) VALUES (?,?,?,?)",
    [uid("sup-"), nome, cnpj.length === 14 ? cnpj : null, id],
  );
  // O score gravado conta "tem decisor com nome": as empresas afetadas são
  // recalculadas na próxima busca.
  const palavras = nome.split(" ").filter((w) => w.length >= 3);
  if (palavras.length) {
    const cond = palavras.map(() => "UPPER(public_records) LIKE ?").join(" AND ");
    const params: unknown[] = palavras.map((w) => `%${w}%`);
    let sql = `UPDATE companies SET rank_version = NULL WHERE ${cond}`;
    if (cnpj.length === 14) {
      sql += " AND regexp_replace(cnpj, '\\D', '', 'g') = ?";
      params.push(cnpj);
    }
    await q(sql, params);
  }
  await carregarSupressoes(true);
  return { id, suprimido: true };
}
