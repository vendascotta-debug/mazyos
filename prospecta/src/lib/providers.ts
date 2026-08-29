import type { Company } from "@/lib/types";
import type { PublicRecords } from "@/lib/decisores";

// ---------------------------------------------------------------------------
// Conectores de dados públicos.
//
// O app inteiro consome empresas pelo repositório (SQLite). Os provedores são
// o ponto de entrada de dados novos — trocar a base de demonstração por dados
// reais é implementar estas interfaces e agendar o `ingest`.
//
// Fontes previstas para o Food Service:
//   • Receita Federal / CNPJ (BrasilAPI, ReceitaWS) → razão social, CNAE,
//     porte, capital, situação e QSA (base do motor de decisores).
//   • OpenStreetMap / Overpass → endereço, coordenadas, categoria, horário.
//   • Avaliações públicas de mapa → volume e reputação (proxy de movimento).
//   • LinkedIn (perfis públicos) → cargo + nome de Compras, Suprimentos e A&B.
//
// Nota de conformidade: o Prospecta trabalha só com dado público e não faz
// scraping autenticado do LinkedIn (contra os termos da plataforma). O fluxo
// suportado é busca pública / X-Ray, com confirmação humana antes de gravar —
// ver `confirmContact` na ficha da empresa.
// ---------------------------------------------------------------------------

export interface CompanyDraft {
  company: Omit<Company, "createdAt" | "updatedAt">;
  records: PublicRecords;
}

export interface GeoQuery {
  segmentSlug: string;
  subsegments: string[];
  city: string;
  uf: string;
  neighborhood?: string | null;
  radiusKm?: number | null;
  center?: { lat: number; lng: number } | null;
}

export interface DataProvider {
  id: string;
  label: string;
  /** Descobre estabelecimentos na área e devolve o esqueleto da empresa. */
  discover(query: GeoQuery): Promise<CompanyDraft[]>;
}

export interface EnrichmentProvider {
  id: string;
  label: string;
  /** Completa uma empresa já descoberta (CNPJ, QSA, decisores, contatos). */
  enrich(draft: CompanyDraft): Promise<CompanyDraft>;
}

/** Provedor de demonstração: a base local semeada em `seed.ts`. */
export const seedProvider: DataProvider = {
  id: "seed",
  label: "Base de demonstração",
  async discover() {
    return [];
  },
};

/**
 * Esqueleto do conector de CNPJ. Mantido explícito (e não implementado) pra
 * deixar claro o contrato esperado quando a chave de API entrar.
 */
export const cnpjProvider: EnrichmentProvider = {
  id: "cnpj",
  label: "Receita Federal · CNPJ + QSA",
  async enrich(draft) {
    const cnpj = draft.company.cnpj?.replace(/\D/g, "");
    if (!cnpj || !process.env.PROSPECTA_CNPJ_API) return draft;

    const res = await fetch(`${process.env.PROSPECTA_CNPJ_API}/${cnpj}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return draft;
    const data = (await res.json()) as {
      razao_social?: string;
      capital_social?: number;
      porte?: string;
      descricao_situacao_cadastral?: string;
      qsa?: { nome_socio: string; qualificacao_socio: string; data_entrada_sociedade: string }[];
    };

    return {
      company: {
        ...draft.company,
        legalName: data.razao_social ?? draft.company.legalName,
        capitalSocial: data.capital_social ?? draft.company.capitalSocial,
      },
      records: {
        ...draft.records,
        qsa: (data.qsa ?? []).map((s) => ({
          nome: s.nome_socio,
          qualificacao: s.qualificacao_socio,
          entrada: s.data_entrada_sociedade ?? null,
          participacao: null,
        })),
      },
    };
  },
};

export const PROVIDERS: (DataProvider | EnrichmentProvider)[] = [seedProvider, cnpjProvider];
