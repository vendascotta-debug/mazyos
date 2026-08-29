import type { Company, DecisionMaker, RoleCategory } from "@/lib/types";
import { getSegment } from "@/lib/segments";

// ---------------------------------------------------------------------------
// Motor de identificação de decisores — o diferencial do Prospecta.
//
// Trabalha em três camadas, da mais forte pra mais fraca:
//   1. QSA (quadro societário público da Receita Federal) → pessoa com nome.
//   2. Perfis públicos do LinkedIn e menções na web (site institucional,
//      imprensa, redes) que citam cargo + nome ligados ao CNPJ/nome fantasia.
//   3. Inferência de cargo por porte da operação — sem nome, mas dizendo
//      exatamente quem procurar e como abordar.
//
// Nada é inventado: cada decisor carrega `evidence` (o que sustenta a
// afirmação), `source` (de onde veio) e `confidence`.
// ---------------------------------------------------------------------------

export interface QsaEntry {
  nome: string;
  qualificacao: string; // ex.: "Sócio-Administrador"
  entrada: string | null;
  participacao: number | null;
  faixaEtaria?: string | null;
}

export interface WebMention {
  nome: string | null;
  cargo: string;
  fonte: string; // ex.: "LinkedIn", "Site oficial", "Instagram"
  url?: string;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  /** Quão explícito é o vínculo pessoa ↔ empresa na fonte. */
  vinculo: "explicito" | "provavel";
}

export interface PublicRecords {
  qsa: QsaEntry[];
  mentions: WebMention[];
  employeesEstimate: number;
}

const NORMALIZE = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Mapeia um cargo em texto livre pra uma categoria estável do sistema. */
export function classifyRole(raw: string): RoleCategory {
  const t = NORMALIZE(raw);
  if (/(proprietari|dono|owner|titular|empresari individual|fundador|founder)/.test(t)) return "proprietario";
  if (/(compras|purchas|buyer|procurement)/.test(t)) return "gerente_compras";
  if (/(suprimento|almoxarif|supply|estoque|logistic)/.test(t)) return "suprimentos";
  if (/(nutricionista|nutricao|responsavel tecnic[oa] de nutricao|rt de nutricao)/.test(t)) return "nutricao";
  if (/(a&b|a e b|alimentos e bebidas|food and beverage|f&b|chef executiv|maitre)/.test(t)) return "ab";
  if (/(operac|operations|gerente geral|general manager|gerente de unidade|gerente de loja)/.test(t)) return "operacoes";
  if (/(financ|controlad|cfo|contas a pagar)/.test(t)) return "financeiro";
  if (/(marketing|comercial|vendas)/.test(t)) return "marketing";
  if (/(diretor|director|ceo|presidente|administrador da sociedade)/.test(t)) return "diretor";
  if (/(soci|partner|administrador)/.test(t)) return "socio";
  return "outro";
}

/** Qualificações do QSA que indicam poder de decisão sobre compras. */
function qsaDecisionWeight(qualificacao: string): { category: RoleCategory; decides: boolean } {
  const t = NORMALIZE(qualificacao);
  if (/administrador/.test(t)) return { category: "socio", decides: true };
  if (/empresari(o|a) individual|titular/.test(t)) return { category: "proprietario", decides: true };
  if (/presidente|diretor/.test(t)) return { category: "diretor", decides: true };
  if (/^socio/.test(t)) return { category: "socio", decides: true };
  // Sócio sem poder de administração, capitalista, cônjuge etc.
  return { category: "socio", decides: false };
}

const firstName = (nome: string) => nome.trim().split(/\s+/)[0];

/**
 * Deriva os decisores prováveis a partir dos dados públicos da empresa.
 * É executado na leitura (não no import), então melhorias no motor valem
 * retroativamente pra toda a base.
 */
export function derivarDecisores(company: Company, records: PublicRecords): DecisionMaker[] {
  const segment = getSegment(company.segmentSlug);
  const out: DecisionMaker[] = [];
  const emp = records.employeesEstimate;
  const seen = new Set<string>();

  // --- Camada 1: quadro societário público -------------------------------
  for (const socio of records.qsa) {
    const { category, decides } = qsaDecisionWeight(socio.qualificacao);
    const key = NORMALIZE(socio.nome);
    if (seen.has(key)) continue;
    seen.add(key);

    // Numa operação enxuta, o sócio administrador é literalmente quem compra.
    const donoOperando = decides && emp < 25;
    out.push({
      id: `${company.id}:qsa:${key.replace(/\W+/g, "-")}`,
      companyId: company.id,
      name: socio.nome,
      role: donoOperando ? `${socio.qualificacao} (compra direto)` : socio.qualificacao,
      roleCategory: donoOperando && category === "socio" ? "proprietario" : category,
      confidence: decides ? "alta" : "media",
      evidence: decides
        ? `Consta no quadro societário público (Receita Federal) como ${socio.qualificacao}${socio.entrada ? `, desde ${new Date(socio.entrada).toLocaleDateString("pt-BR")}` : ""}. ${donoOperando ? "Porte da operação indica que a compra de insumos passa por ele(a)." : "Assina contrato de fornecimento."}`
        : `Consta no quadro societário como ${socio.qualificacao} — participação sem poder de administração declarado; pode não decidir compras.`,
      source: "Receita Federal · QSA",
      phone: null,
      email: null,
      linkedin: null,
      inferred: false,
      entryDate: socio.entrada,
      participation: socio.participacao,
    });
  }

  // --- Camada 2: LinkedIn e menções públicas na web -----------------------
  for (const m of records.mentions) {
    const category = classifyRole(m.cargo);
    const key = m.nome ? NORMALIZE(m.nome) : `cargo:${NORMALIZE(m.cargo)}`;
    const existente = m.nome ? out.find((d) => d.name && NORMALIZE(d.name) === key) : null;

    if (existente) {
      // Mesma pessoa achada em duas fontes: reforça a confiança e completa contato.
      existente.confidence = "alta";
      existente.phone ??= m.phone ?? null;
      existente.email ??= m.email ?? null;
      existente.linkedin ??= m.linkedin ?? m.url ?? null;
      existente.evidence += ` Confirmado também em ${m.fonte} como "${m.cargo}".`;
      existente.source += ` + ${m.fonte}`;
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);

    const isLinkedIn = /linkedin/i.test(m.fonte);
    out.push({
      id: `${company.id}:web:${key.replace(/\W+/g, "-")}`,
      companyId: company.id,
      name: m.nome,
      role: m.cargo,
      roleCategory: category,
      confidence: m.vinculo === "explicito" ? (isLinkedIn ? "alta" : "media") : "baixa",
      evidence:
        m.vinculo === "explicito"
          ? `${m.fonte} lista o cargo "${m.cargo}" vinculado a ${company.name}${isLinkedIn ? " no perfil público" : ""}.`
          : `Menção em ${m.fonte} sugere o cargo "${m.cargo}", sem vínculo confirmado com o CNPJ. Validar no contato.`,
      source: m.fonte,
      phone: m.phone ?? null,
      email: m.email ?? null,
      linkedin: m.linkedin ?? (isLinkedIn ? (m.url ?? null) : null),
      inferred: !m.nome,
      entryDate: null,
      participation: null,
    });
  }

  // --- Camada 3: inferência de cargo por porte ----------------------------
  // Só sugere cargos que ainda não apareceram e que fazem sentido pro tamanho
  // da operação — evita mandar o usuário procurar "gerente de compras" numa
  // pizzaria de 6 funcionários.
  const categoriasPresentes = new Set(out.map((d) => d.roleCategory));
  const faltantes = segment.decisionRoles
    .filter((r) => emp >= r.minEmployees && !categoriasPresentes.has(r.category))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, out.some((d) => d.name) ? 2 : 3);

  for (const role of faltantes) {
    // Se já temos gente com nome, só vale inferir cargos operacionais de compra.
    if (out.some((d) => d.name) && !["gerente_compras", "suprimentos", "ab", "operacoes"].includes(role.category)) {
      continue;
    }
    out.push({
      id: `${company.id}:inf:${role.category}`,
      companyId: company.id,
      name: null,
      role: role.title,
      roleCategory: role.category,
      confidence: emp >= role.minEmployees + 15 ? "media" : "baixa",
      evidence: `Cargo provável pelo porte da operação (~${emp} funcionários, ${company.porte ?? "porte n/d"}). Nome não localizado em fonte pública. ${role.approach}`,
      source: "Inferência Prospecta",
      phone: null,
      email: null,
      linkedin: null,
      inferred: true,
      entryDate: null,
      participation: null,
    });
  }

  // Ordena por prioridade de abordagem do segmento, depois por confiança.
  const prioridade = new Map(segment.decisionRoles.map((r) => [r.category, r.priority]));
  const confRank = { alta: 0, media: 1, baixa: 2 } as const;
  return out.sort((a, b) => {
    if (a.inferred !== b.inferred) return a.inferred ? 1 : -1;
    const c = confRank[a.confidence] - confRank[b.confidence];
    if (c !== 0) return c;
    return (prioridade.get(a.roleCategory) ?? 9) - (prioridade.get(b.roleCategory) ?? 9);
  });
}

/** Dica de abordagem do segmento pro cargo encontrado. */
export function approachFor(company: Company, d: DecisionMaker): string {
  const segment = getSegment(company.segmentSlug);
  const role = segment.decisionRoles.find((r) => r.category === d.roleCategory);
  if (role) return role.approach;
  return segment.labels.buyerHint;
}

/**
 * Busca X-Ray no LinkedIn: quando não achamos o nome, entregamos a consulta
 * pronta em vez de um beco sem saída. Não fazemos scraping do LinkedIn —
 * o usuário abre, confirma o perfil e traz o dado pro Prospecta.
 */
export function linkedinSearchUrl(company: Company, cargos?: string[]): string {
  const seg = getSegment(company.segmentSlug);
  const alvos = cargos?.length
    ? cargos
    : seg.decisionRoles.slice(0, 4).map((r) => r.title);
  const termos = alvos.map((c) => `"${c}"`).join(" OR ");
  const q = `site:linkedin.com/in "${company.name}" (${termos})`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/**
 * X-Ray de uma pessoa específica: nome + empresa. Usado quando já sabemos quem
 * é (via QSA, por exemplo) e falta o perfil pra abordagem social.
 */
export function linkedinPersonUrl(company: Company, personName: string): string {
  const q = `site:linkedin.com/in "${personName}" "${company.name}"`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/** Busca direta na base de pessoas do LinkedIn, filtrada pela empresa. */
export function linkedinPeopleUrl(company: Company): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company.name)}`;
}

export function bestDecisionMaker(list: DecisionMaker[]): DecisionMaker | null {
  return list.find((d) => d.name && d.confidence === "alta") ?? list.find((d) => d.name) ?? list[0] ?? null;
}

export const ROLE_LABEL: Record<RoleCategory, string> = {
  proprietario: "Proprietário",
  socio: "Sócio",
  diretor: "Diretoria",
  gerente_compras: "Compras",
  suprimentos: "Suprimentos",
  operacoes: "Operações",
  ab: "A&B",
  nutricao: "Nutrição",
  financeiro: "Financeiro",
  marketing: "Marketing",
  outro: "Outro",
};
