import { nowIso, q, q1, uid } from "@/lib/db";
import { saveLead } from "@/lib/repo";
import { getSegment } from "@/lib/segments";
import type { PublicRecords } from "@/lib/decisores";

// ---------------------------------------------------------------------------
// Lead de fora da base: cadastro manual e importação de planilha.
//
// Antes de criar qualquer coisa, tenta reconhecer a empresa na base pública —
// assim o lead ganha o quadro societário da Receita de graça. Só cria uma
// empresa nova (privada, `owner_user_id`) quando não há casamento confiável.
//
// Casamento confiável, em ordem:
//   1. CNPJ idêntico.
//   2. Telefone idêntico (8 últimos dígitos) E pelo menos uma palavra do nome
//      em comum. Só telefone não basta: o da Receita costuma ser o do
//      contador, que aparece em dezenas de empresas.
// ---------------------------------------------------------------------------

export interface LeadManual {
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  site?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  cidade?: string | null;
  uf?: string | null;
  bairro?: string | null;
  endereco?: string | null;
  decisor?: string | null;
  cargoDecisor?: string | null;
  emailDecisor?: string | null;
  telefoneDecisor?: string | null;
  linkedinDecisor?: string | null;
  observacao?: string | null;
}

export interface OpcoesImportacao {
  segmento: string;
  subsegmento: string;
  listaId?: string | null;
}

export type ResultadoLinha =
  | { linha: number; status: "base"; empresa: string; leadId: string; como: "cnpj" | "telefone" }
  | { linha: number; status: "nova"; empresa: string; leadId: string }
  | { linha: number; status: "repetida"; empresa: string; leadId: string }
  | { linha: number; status: "erro"; empresa: string; erro: string };

const SP_CENTRO = { lat: -23.5505, lng: -46.6333 };

const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
const limpo = (s: string | null | undefined) => {
  const t = (s ?? "").trim();
  return t ? t : null;
};

const NORMALIZE = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Palavras que não identificam a empresa. */
const GENERICAS = new Set([
  "buffet", "eventos", "evento", "festas", "festa", "locacao", "locacoes", "ltda", "eireli", "me", "epp",
  "comercio", "servicos", "restaurante", "gastronomia", "alimentos", "alimentacao", "cia", "and", "the",
  "sao", "paulo", "espaco", "casa", "grupo", "catering", "coffee", "break", "de", "da", "do", "das", "dos", "e",
]);

function palavrasDoNome(nome: string): Set<string> {
  return new Set(
    NORMALIZE(nome)
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3 && !GENERICAS.has(p)),
  );
}

function nomesParecidos(a: string, b: string): boolean {
  const pa = palavrasDoNome(a);
  for (const p of palavrasDoNome(b)) if (pa.has(p)) return true;
  return false;
}

export function formatarCnpj(d: string): string {
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d;
}

function formatarTelefone(raw: string | null): string | null {
  if (!raw) return null;
  let d = digitos(raw);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw.trim();
}

function normalizarSite(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

type Base = { id: string; name: string; legal_name: string; cnpj: string | null; phone: string | null };

/** Uma consulta para o lote inteiro, não uma por linha. */
async function candidatosNaBase(linhas: LeadManual[]) {
  const cnpjs = [...new Set(linhas.map((l) => digitos(l.cnpj)).filter((d) => d.length === 14))];
  const fones = [
    ...new Set(
      linhas
        .flatMap((l) => [l.telefone, l.whatsapp])
        .map((t) => digitos(t))
        .filter((d) => d.length >= 8)
        .map((d) => d.slice(-8)),
    ),
  ];

  const porCnpj = new Map<string, Base>();
  const porFone = new Map<string, Base[]>();

  if (cnpjs.length) {
    const rows = await q<Base & { cnpj_d: string }>(
      `SELECT id, name, legal_name, cnpj, phone, regexp_replace(cnpj, '\\D', '', 'g') AS cnpj_d
       FROM companies
       WHERE owner_user_id IS NULL AND regexp_replace(cnpj, '\\D', '', 'g') IN (${cnpjs.map(() => "?").join(",")})`,
      cnpjs,
    );
    for (const r of rows) porCnpj.set(r.cnpj_d, r);
  }

  if (fones.length) {
    const rows = await q<Base & { fone8: string }>(
      `SELECT id, name, legal_name, cnpj, phone, RIGHT(regexp_replace(phone, '\\D', '', 'g'), 8) AS fone8
       FROM companies
       WHERE owner_user_id IS NULL AND phone IS NOT NULL
         AND RIGHT(regexp_replace(phone, '\\D', '', 'g'), 8) IN (${fones.map(() => "?").join(",")})`,
      fones,
    );
    for (const r of rows) {
      const lista = porFone.get(r.fone8) ?? [];
      lista.push(r);
      porFone.set(r.fone8, lista);
    }
  }

  return { porCnpj, porFone };
}

async function centroDaCidade(cidade: string | null, uf: string | null): Promise<{ lat: number; lng: number }> {
  if (!cidade) return SP_CENTRO;
  const row = await q1<{ lat: number | null; lng: number | null }>(
    `SELECT AVG(lat)::float8 AS lat, AVG(lng)::float8 AS lng FROM companies
     WHERE owner_user_id IS NULL AND LOWER(city) = LOWER(?) AND (?::text IS NULL OR uf = ?)`,
    [cidade, uf, uf],
  );
  if (row?.lat == null || row?.lng == null) return SP_CENTRO;
  return { lat: Number(row.lat), lng: Number(row.lng) };
}

async function criarEmpresaPrivada(userId: string, l: LeadManual, op: OpcoesImportacao): Promise<string> {
  const nome = l.nome.trim();

  // Mesmo nome já cadastrado por este usuário: reaproveita em vez de duplicar.
  const ja = await q1<{ id: string }>(
    "SELECT id FROM companies WHERE owner_user_id = ? AND LOWER(name) = LOWER(?) LIMIT 1",
    [userId, nome],
  );
  if (ja) return ja.id;

  const cidade = limpo(l.cidade) ?? "São Paulo";
  const uf = (limpo(l.uf) ?? "SP").toUpperCase().slice(0, 2);
  const centro = await centroDaCidade(cidade, uf);
  // Desloca de leve para os pinos da mesma cidade não ficarem empilhados.
  const jitter = () => (Math.random() - 0.5) * 0.02;

  const records: PublicRecords = { qsa: [], mentions: [], employeesEstimate: 5 };
  if (limpo(l.decisor) || limpo(l.cargoDecisor)) {
    records.mentions.push({
      nome: limpo(l.decisor),
      cargo: limpo(l.cargoDecisor) ?? "Decisor",
      fonte: "Informado por você",
      vinculo: "explicito",
      email: limpo(l.emailDecisor),
      phone: formatarTelefone(limpo(l.telefoneDecisor)),
      linkedin: limpo(l.linkedinDecisor),
    });
  }

  const id = uid("mn-");
  const agora = nowIso();
  const cnpj = digitos(l.cnpj);
  const fonte = [{ label: "Cadastrado por você (manual ou planilha)", kind: "web", collectedAt: agora.slice(0, 10) }];

  await q(
    `INSERT INTO companies (
       id, owner_user_id, segment_slug, subsegment_slug, name, legal_name, cnpj,
       street, number, neighborhood, city, uf, lat, lng,
       phone, whatsapp, email, website, instagram, linkedin,
       sources, public_records, created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, userId, op.segmento, op.subsegmento, nome, nome, cnpj.length === 14 ? formatarCnpj(cnpj) : null,
      limpo(l.endereco) ?? "", "", limpo(l.bairro) ?? "", cidade, uf,
      centro.lat + jitter(), centro.lng + jitter(),
      formatarTelefone(limpo(l.telefone)), formatarTelefone(limpo(l.whatsapp)), limpo(l.email),
      normalizarSite(limpo(l.site)), limpo(l.instagram), limpo(l.linkedin),
      JSON.stringify(fonte), JSON.stringify(records), agora, agora,
    ],
  );
  return id;
}

/** Notas que o usuário trouxe e que não têm coluna própria na empresa da base. */
function notaDaLinha(l: LeadManual, naBase: boolean): string | null {
  const partes: string[] = [];
  if (limpo(l.observacao)) partes.push(l.observacao!.trim());
  if (naBase) {
    // Empresa da base: os contatos da planilha não sobrescrevem os da Receita,
    // mas não podem se perder.
    const extras = [
      limpo(l.decisor) && `Decisor informado: ${l.decisor!.trim()}${limpo(l.cargoDecisor) ? ` (${l.cargoDecisor!.trim()})` : ""}`,
      limpo(l.whatsapp) && `WhatsApp: ${l.whatsapp!.trim()}`,
      limpo(l.telefone) && `Telefone: ${l.telefone!.trim()}`,
      limpo(l.email) && `E-mail: ${l.email!.trim()}`,
      limpo(l.site) && `Site: ${l.site!.trim()}`,
      limpo(l.instagram) && `Instagram: ${l.instagram!.trim()}`,
    ].filter(Boolean) as string[];
    partes.push(...extras);
  }
  return partes.length ? partes.join("\n").slice(0, 2000) : null;
}

export async function importarLeads(
  userId: string,
  linhas: LeadManual[],
  op: OpcoesImportacao,
): Promise<ResultadoLinha[]> {
  const segmento = getSegment(op.segmento);
  if (!segmento.subsegments.some((s) => s.slug === op.subsegmento)) {
    op = { ...op, subsegmento: segmento.subsegments[0].slug };
  }
  op = { ...op, segmento: segmento.slug };

  const { porCnpj, porFone } = await candidatosNaBase(linhas);
  const resultados: ResultadoLinha[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const nome = l.nome?.trim() ?? "";
    if (nome.length < 2) {
      resultados.push({ linha: i + 1, status: "erro", empresa: nome || "(sem nome)", erro: "Falta o nome da empresa." });
      continue;
    }

    try {
      let empresaId: string | null = null;
      let como: "cnpj" | "telefone" | null = null;

      const cnpj = digitos(l.cnpj);
      if (cnpj.length === 14 && porCnpj.has(cnpj)) {
        empresaId = porCnpj.get(cnpj)!.id;
        como = "cnpj";
      }
      if (!empresaId) {
        for (const tel of [l.telefone, l.whatsapp]) {
          const d = digitos(tel);
          if (d.length < 8) continue;
          const achados = (porFone.get(d.slice(-8)) ?? []).filter(
            (c) => nomesParecidos(nome, c.name) || nomesParecidos(nome, c.legal_name),
          );
          if (achados.length === 1) {
            empresaId = achados[0].id;
            como = "telefone";
            break;
          }
        }
      }

      const naBase = empresaId != null;
      if (!empresaId) empresaId = await criarEmpresaPrivada(userId, l, op);

      const antes = await q1<{ id: string }>("SELECT id FROM leads WHERE user_id = ? AND company_id = ?", [
        userId,
        empresaId,
      ]);
      const lead = await saveLead(userId, empresaId, {
        listId: op.listaId ?? null,
        note: notaDaLinha(l, naBase),
        origem: naBase ? `pela importação (reconhecido na base por ${como})` : "por cadastro manual/importação",
      });

      if (antes) resultados.push({ linha: i + 1, status: "repetida", empresa: nome, leadId: lead.id });
      else if (naBase) resultados.push({ linha: i + 1, status: "base", empresa: nome, leadId: lead.id, como: como! });
      else resultados.push({ linha: i + 1, status: "nova", empresa: nome, leadId: lead.id });
    } catch (e) {
      resultados.push({ linha: i + 1, status: "erro", empresa: nome, erro: (e as Error).message });
    }
  }
  return resultados;
}
