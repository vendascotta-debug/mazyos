import { q } from "@/lib/db";
import type { Porte, SituacaoCadastral, UF } from "@/lib/types";
import type { PublicRecords, QsaEntry, WebMention } from "@/lib/decisores";
// ---------------------------------------------------------------------------
// Base de demonstração.
//
// Em produção estas linhas vêm dos conectores de dados públicos
// (ver src/lib/providers): Receita Federal / CNPJ, OpenStreetMap, avaliações
// de mapa e perfis públicos do LinkedIn. Aqui geramos uma base determinística
// e realista pra que o produto seja navegável do primeiro `npm run dev`.
// ---------------------------------------------------------------------------
// PRNG determinístico — mesma base a cada reconstrução.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const between = (r: () => number, a: number, b: number) => a + r() * (b - a);
const chance = (r: () => number, p: number) => r() < p;

interface Bairro { name: string; lat: number; lng: number }
interface Cidade { city: string; uf: UF; ddd: string; bairros: Bairro[] }

const CIDADES: Cidade[] = [
  {
    city: "São Paulo", uf: "SP", ddd: "11",
    bairros: [
      { name: "Pinheiros", lat: -23.5665, lng: -46.702 },
      { name: "Vila Madalena", lat: -23.5545, lng: -46.689 },
      { name: "Moema", lat: -23.6009, lng: -46.6644 },
      { name: "Itaim Bibi", lat: -23.586, lng: -46.68 },
      { name: "Tatuapé", lat: -23.54, lng: -46.576 },
      { name: "Santana", lat: -23.5, lng: -46.625 },
      { name: "República", lat: -23.545, lng: -46.642 },
      { name: "Brooklin", lat: -23.618, lng: -46.696 },
      { name: "Perdizes", lat: -23.5375, lng: -46.6795 },
      { name: "Vila Mariana", lat: -23.5895, lng: -46.6345 },
    ],
  },
  {
    city: "Campinas", uf: "SP", ddd: "19",
    bairros: [
      { name: "Cambuí", lat: -22.894, lng: -47.049 },
      { name: "Barão Geraldo", lat: -22.818, lng: -47.069 },
      { name: "Taquaral", lat: -22.879, lng: -47.048 },
      { name: "Centro", lat: -22.905, lng: -47.06 },
      { name: "Guanabara", lat: -22.8875, lng: -47.0455 },
    ],
  },
  {
    city: "Curitiba", uf: "PR", ddd: "41",
    bairros: [
      { name: "Batel", lat: -25.441, lng: -49.29 },
      { name: "Centro", lat: -25.429, lng: -49.271 },
      { name: "Água Verde", lat: -25.456, lng: -49.283 },
      { name: "Bigorrilho", lat: -25.433, lng: -49.299 },
      { name: "Cabral", lat: -25.4045, lng: -49.2585 },
    ],
  },
  {
    city: "Belo Horizonte", uf: "MG", ddd: "31",
    bairros: [
      { name: "Savassi", lat: -19.938, lng: -43.934 },
      { name: "Lourdes", lat: -19.932, lng: -43.945 },
      { name: "Funcionários", lat: -19.936, lng: -43.929 },
      { name: "Pampulha", lat: -19.856, lng: -43.98 },
    ],
  },
];

const NOMES_POR_SUB: Record<string, [string[], string[]]> = {
  restaurante: [
    ["Cantina", "Restaurante", "Casa", "Sabor", "Empório", "Villa", "Terra"],
    ["Bella Massa", "do Chef", "Mineira", "da Praça", "Nordestino", "Verde", "do Porto", "Mattos", "São Jorge"],
  ],
  pizzaria: [
    ["Pizzaria", "Forno", "La", "Don"],
    ["Napoletana", "de Pedra", "Bella Napoli", "Cipriani", "do Bairro", "Vesúvio", "Mamma Rosa"],
  ],
  churrascaria: [
    ["Churrascaria", "Grill", "Estância"],
    ["Fogo do Sul", "Boi na Brasa", "Gaúcha", "do Pampa", "Costela de Ouro", "Tropeiro"],
  ],
  bar: [
    ["Bar do", "Boteco", "Choperia", "Armazém"],
    ["Zé", "Central", "da Vila", "Seu Oswaldo", "Bragança", "Esquina", "Lupita"],
  ],
  lanchonete: [
    ["Burger", "Lanches", "Hamburgueria", "Ponto do"],
    ["House", "do Parque", "Brasa", "Duplo", "Império", "Big Joe"],
  ],
  padaria: [
    ["Padaria", "Panificadora", "Confeitaria"],
    ["Estrela", "São Judas", "Pão Dourado", "Real", "Vila Nova", "Doce Manhã", "Delícia"],
  ],
  cafeteria: [
    ["Café", "Coffee", "Casa do Café"],
    ["Cultura", "Origem", "& Cia", "Torra Forte", "Grão Nobre", "Lab"],
  ],
  hotel: [
    ["Hotel", "Pousada", "Resort"],
    ["Palace", "Executivo", "das Águas", "Central Plaza", "Vista Serra", "Metropolitan"],
  ],
  "cozinha-industrial": [
    ["Nutri", "Sabor", "Prato", "Refeições"],
    ["Refeições Coletivas", "Industrial", "Certo", "Alimentação", "Total", "Master"],
  ],
  buffet: [
    ["Buffet", "Espaço", "Eventos"],
    ["Encanto", "Villa Real", "Recepções", "Prime", "Jardim"],
  ],
  "dark-kitchen": [
    ["Cozinha", "Kitchen", "Delivery"],
    ["Hub", "Express", "OnFire", "Nove", "Prime"],
  ],
  hospital: [
    ["Hospital", "Casa de Saúde", "Hospital e Maternidade"],
    ["São Camilo", "Santa Rita", "Bom Jesus", "Central", "Nossa Senhora", "Vida Plena"],
  ],
  escola: [
    ["Colégio", "Escola", "Centro Educacional", "Faculdade"],
    ["Santa Clara", "Objetivo Norte", "Dom Bosco", "Integrado", "Novo Saber", "Monteiro Lobato"],
  ],
  gastronomia: [
    ["Escola de Gastronomia", "Instituto de Gastronomia", "Faculdade de Gastronomia", "Ateliê Culinário"],
    ["Le Chef", "Sabor & Arte", "Cordon Sul", "Mise en Place", "Gastronomia Brasil", "Fogo e Sal"],
  ],
  asilo: [
    ["Residencial", "Casa de Repouso", "Lar", "Recanto"],
    ["Bem Viver", "Vovó Ana", "dos Idosos", "Serenidade", "Primavera", "Nova Vida"],
  ],
  motel: [
    ["Motel", "Suítes"],
    ["Status", "Le Rouge", "Villa Bella", "Paradiso", "Class", "Vitória"],
  ],
  clube: [
    ["Clube", "Associação", "Sociedade", "Grêmio"],
    ["Recreativo", "dos Funcionários", "Campestre", "Atlético", "União", "Náutico"],
  ],
  supermercado: [
    ["Supermercado", "Mercado", "Hipermercado"],
    ["Bom Preço", "Center", "Popular", "Silva", "Nova Era", "do Bairro"],
  ],
  "industria-refeitorio": [
    ["Indústria", "Metalúrgica", "Fábrica", "Frigorífico"],
    ["Santa Helena", "Paulista", "Brasil Sul", "Andrade", "Nacional", "Ouro Verde"],
  ],
  franquia: [
    ["Rede", "Grupo", "Franqueadora"],
    ["Sabor Brasil", "Master Food", "Bom Prato", "Nutri Rede", "Casa Grill"],
  ],
  "industria-alimenticia": [
    ["Alimentos", "Laticínios", "Indústria de Alimentos", "Sorvetes"],
    ["Bom Sabor", "Vale Verde", "Delícia", "Serra Azul", "Primor"],
  ],
  "industria-farmaceutica": [
    ["Laboratório", "Farmacêutica", "Cosméticos"],
    ["Vitalis", "BioNova", "Saúde Brasil", "Derma Plus", "Essência"],
  ],
  sorveteria: [
    ["Sorveteria", "Açaí", "Gelateria"],
    ["Gelato", "da Praça", "Tropical", "Doce Gelo", "Amazônia", "Frutos"],
  ],
  "food-truck": [
    ["Food Truck", "Trailer", "Carreta"],
    ["do Zé", "Burger na Rua", "Sabor Móvel", "Rodas", "Street"],
  ],
  resort: [
    ["Resort", "Hotel Fazenda", "Spa"],
    ["Costa Verde", "Serra Azul", "das Termas", "Village", "Solar"],
  ],
  hostel: [
    ["Hostel", "Apart-Hotel", "Flat"],
    ["Central", "Backpackers", "da Praia", "Urbano", "Estação"],
  ],
  "distribuidor-alimentos": [
    ["Distribuidora", "Atacado", "Comercial"],
    ["Alimentos Sul", "Prime Food", "Central de Insumos", "Sabor & Cia", "Nordeste"],
  ],
  "revenda-equipamentos": [
    ["Equipamentos", "Casa do Chef", "Utensílios", "Comercial"],
    ["Gastronômicos", "Inox Brasil", "Profissional", "do Restaurante", "Master"],
  ],
  representante: [
    ["Representações", "Representação Comercial", "Agência"],
    ["Andrade", "Sul Food", "Bianchi", "Nova Rota", "Prime"],
  ],
  "distribuidor-bebidas": [
    ["Distribuidora de Bebidas", "Bebidas", "Depósito"],
    ["Águia", "Central", "do Vale", "Prime", "Litoral"],
  ],
  importador: [
    ["Importadora", "Trading", "Comercial Importadora"],
    ["Atlântico", "Global Food", "Mediterrâneo", "Andina", "Oriental"],
  ],
  "arquitetura-comercial": [
    ["Arquitetura", "Studio", "Atelier", "Escritório"],
    ["Mesa & Forma", "Contexto", "Interna", "Vértice", "Casa Nova", "Trama"],
  ],
  "projetista-cozinha": [
    ["Projetos", "Engenharia de Cozinhas", "Cozinha Projeto"],
    ["Fluxo", "Cozinha Viva", "Linha Quente", "Inox Projeto", "Praça Central"],
  ],
  construtora: [
    ["Construtora", "Engenharia", "Construções"],
    ["Andrade Lima", "Horizonte", "Base Forte", "São Bento", "Cordeiro", "Alicerce"],
  ],
  interiores: [
    ["Interiores", "Design", "Studio de Interiores"],
    ["Ambiente", "Cena", "Habitat", "Luz e Forma", "Corpo"],
  ],
  marcenaria: [
    ["Marcenaria", "Móveis sob Medida", "Madeira"],
    ["do Bosque", "Artesanal", "Nobre", "Linha Reta", "Tora"],
  ],
  "consultoria-gastronomica": [
    ["Consultoria", "Consultoria Gastronômica", "Hub"],
    ["Mesa Cheia", "Ponto de Partida", "Sala & Salão", "Operação", "Menu Certo"],
  ],
  "clinica-medica": [["Clínica", "Centro Médico", "Instituto"], ["Vida", "Saúde Integrada", "São Lucas", "Bem Estar", "Nova Era"]],
  odontologia: [["Odonto", "Clínica Odontológica", "Sorriso"], ["Prime", "Center", "Ideal", "Vita", "Plus"]],
  laboratorio: [["Laboratório", "Lab", "Instituto de Análises"], ["Diagnóstico", "Precisão", "Central", "Bio", "Exata"]],
  estetica: [["Espaço", "Clínica de Estética", "Studio"], ["Beleza", "Renove", "Zen", "Corpo & Arte", "Lumina"]],
};

const PRIMEIROS = ["Ana", "Carlos", "Marcos", "Juliana", "Roberto", "Fernanda", "Paulo", "Patrícia", "Rodrigo", "Camila", "Eduardo", "Luciana", "André", "Mariana", "Ricardo", "Beatriz", "Fábio", "Tatiana", "Gustavo", "Renata", "Sérgio", "Aline", "Marcelo", "Priscila", "Leonardo", "Vanessa", "Antônio", "Cláudia", "Bruno", "Simone"];
const SOBRENOMES = ["Silva", "Souza", "Oliveira", "Pereira", "Almeida", "Costa", "Rodrigues", "Martins", "Carvalho", "Gomes", "Ribeiro", "Ferreira", "Barbosa", "Moraes", "Nascimento", "Azevedo", "Cavalcanti", "Bianchi", "Tanaka", "Meireles", "Fontana", "Duarte"];

const RUAS = ["Rua das Palmeiras", "Av. Brasil", "Rua Bahia", "Av. Paulista", "Rua Coronel Xavier", "Rua Sete de Setembro", "Av. dos Estados", "Rua Marechal Deodoro", "Rua Joaquim Floriano", "Av. Nossa Senhora de Copacabana", "Rua Padre João", "Alameda Santos"];

const CNAE_DESC: Record<string, string> = {
  "5611-2/01": "Restaurantes e similares",
  "5611-2/03": "Lanchonetes, casas de chá, de sucos e similares",
  "5611-2/04": "Bares e outros estabelecimentos especializados em servir bebidas, sem entretenimento",
  "5611-2/05": "Bares e outros estabelecimentos especializados em servir bebidas, com entretenimento",
  "5620-1/01": "Fornecimento de alimentos preparados preponderantemente para empresas",
  "5620-1/02": "Serviços de alimentação para eventos e recepções - bufê",
  "5620-1/04": "Fornecimento de alimentos preparados preponderantemente para consumo domiciliar",
  "4721-1/02": "Padaria e confeitaria com predominância de revenda",
  "1091-1/02": "Fabricação de produtos de padaria e confeitaria com predominância de produção própria",
  "5510-8/01": "Hotéis",
  "8610-1/01": "Atividades de atendimento hospitalar, exceto pronto-socorro e unidades para atendimento a urgências",
  "8610-1/02": "Atividades de atendimento em pronto-socorro e unidades hospitalares para atendimento a urgências",
  "8513-9/00": "Ensino fundamental",
  "8520-1/00": "Ensino médio",
  "8531-7/00": "Educação superior - graduação",
  "8599-6/04": "Treinamento em desenvolvimento profissional e gerencial",
  "8730-1/01": "Orfanatos, albergues assistenciais e residências para idosos",
  "5510-8/03": "Motéis",
  "9312-3/00": "Clubes sociais, esportivos e similares",
  "4644-3/02": "Comercio atacadista de aparelhos e equipamentos para uso comercial",
  "4639-7/01": "Comercio atacadista de produtos alimenticios em geral",
  "4614-1/00": "Agentes do comercio de materias-primas agricolas e animais vivos",
  "5510-8/02": "Apart-hoteis",
  "4711-3/02": "Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados",
  "5612-1/00": "Serviços ambulantes de alimentação",
  "1053-8/00": "Fabricação de sorvetes e outros gelados comestíveis",
  "7111-1/00": "Servicos de arquitetura",
  "7112-0/00": "Servicos de engenharia",
  "4120-4/00": "Construcao de edificios",
  "7410-2/02": "Design de interiores",
  "3101-2/00": "Fabricacao de moveis com predominancia de madeira",
  "7020-4/00": "Atividades de consultoria em gestao empresarial",
  "4635-4/02": "Comercio atacadista de cerveja, chope e refrigerante",
  "4619-2/00": "Representantes comerciais e agentes do comercio de mercadorias em geral",
  "8630-5/03": "Atividade médica ambulatorial restrita a consultas",
  "8630-5/04": "Atividade odontológica",
  "8640-2/02": "Laboratórios clínicos",
  "9602-5/02": "Atividades de estética e outros serviços de cuidados com a beleza",
};

// Peso = quanto cada subsegmento aparece na base gerada. Os institucionais
// (hospital, escola, asilo, indústria) são menos numerosos que restaurantes no
// mundo real, mas cada um vale muito mais em volume de compra.
const SUBS_FOOD: [string, string, number][] = [
  ["restaurante", "5611-2/01", 22],
  ["pizzaria", "5611-2/01", 10],
  ["churrascaria", "5611-2/01", 6],
  ["bar", "5611-2/04", 11],
  ["lanchonete", "5611-2/03", 12],
  ["padaria", "4721-1/02", 10],
  ["cafeteria", "5611-2/03", 6],
  ["hotel", "5510-8/01", 5],
  ["cozinha-industrial", "5620-1/01", 5],
  ["buffet", "5620-1/02", 4],
  ["dark-kitchen", "5620-1/04", 3],
  ["hospital", "8610-1/01", 5],
  ["escola", "8513-9/00", 6],
  ["gastronomia", "8599-6/04", 3],
  ["asilo", "8730-1/01", 4],
  ["motel", "5510-8/03", 4],
  ["clube", "9312-3/00", 3],
  ["supermercado", "4711-3/02", 6],
  ["industria-refeitorio", "5620-1/01", 5],
  ["sorveteria", "5611-2/03", 4],
  ["food-truck", "5612-1/00", 3],
  ["franquia", "5611-2/01", 4],
  ["industria-alimenticia", "1091-1/01", 4],
  ["industria-farmaceutica", "2121-1/01", 3],
  ["resort", "5510-8/01", 3],
  ["hostel", "5510-8/02", 3],
];

// Canal — segmento próprio: não compram utensílio de você, são prospects de
// dados e do próprio Prospecta.
const SUBS_DIST: [string, string, number][] = [
  ["distribuidor-alimentos", "4639-7/01", 10],
  ["distribuidor-bebidas", "4635-4/02", 6],
  ["revenda-equipamentos", "4644-3/02", 7],
  ["representante", "4614-1/00", 5],
  ["importador", "4619-2/00", 3],
];

const SUBS_ARQ: [string, string, number][] = [
  ["arquitetura-comercial", "7111-1/00", 10],
  ["projetista-cozinha", "7111-1/00", 6],
  ["construtora", "4120-4/00", 7],
  ["interiores", "7410-2/02", 6],
  ["marcenaria", "3101-2/00", 5],
  ["consultoria-gastronomica", "7020-4/00", 5],
];

const SUBS_SAUDE: [string, string, number][] = [
  ["clinica-medica", "8630-5/03", 10],
  ["odontologia", "8630-5/04", 8],
  ["laboratorio", "8640-2/02", 5],
  ["estetica", "9602-5/02", 6],
];

function weightedSub(r: () => number, table: [string, string, number][]): [string, string] {
  const total = table.reduce((a, t) => a + t[2], 0);
  let x = r() * total;
  for (const [slug, cnae, w] of table) {
    x -= w;
    if (x <= 0) return [slug, cnae];
  }
  return [table[0][0], table[0][1]];
}

function cnpjDigits(base: string): string {
  const calc = (nums: number[], pesos: number[]) => {
    const s = nums.reduce((a, n, i) => a + n * pesos[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const n = base.split("").map(Number);
  const d1 = calc(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc([...n, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${d1}${d2}`;
}

function formatCnpj(r: () => number): string {
  const base = Array.from({ length: 8 }, () => Math.floor(r() * 10)).join("") + "0001";
  const dv = cnpjDigits(base);
  return `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/${base.slice(8, 12)}-${dv}`;
}

function nomePessoa(r: () => number): string {
  return `${pick(r, PRIMEIROS)} ${pick(r, SOBRENOMES)} ${pick(r, SOBRENOMES)}`;
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

interface GeneratedCompany {
  row: Record<string, string | number | null>;
}

function gerarEmpresa(i: number, segmentSlug: string): GeneratedCompany {
  const r = rng(i * 7919 + segmentSlug.length * 104729);
  const table =
    segmentSlug === "food-service" ? SUBS_FOOD :
    segmentSlug === "distribuidores" ? SUBS_DIST :
    segmentSlug === "arquitetura" ? SUBS_ARQ :
    SUBS_SAUDE;
  const [sub, cnae] = weightedSub(r, table);
  const cidade = pick(r, CIDADES);
  const bairro = pick(r, cidade.bairros);

  const [pre, suf] = NOMES_POR_SUB[sub];
  const name = `${pick(r, pre)} ${pick(r, suf)}`;

  // Porte correlacionado ao subsegmento: cozinha industrial e hotel puxam pra cima.
  const pesoPorte =
    sub === "hospital" || sub === "industria-refeitorio" || sub === "supermercado" || sub === "distribuidor-alimentos" || sub === "distribuidor-bebidas" || sub === "importador" || sub === "distribuidor" || sub === "resort" || sub === "industria-farmaceutica" || sub === "industria-alimenticia" || sub === "franquia" ? 0.95 :
    sub === "cozinha-industrial" || sub === "hotel" || sub === "escola" ? 0.85 :
    sub === "construtora" || sub === "revenda-equipamentos" || sub === "representante" || sub === "asilo" || sub === "clube" || sub === "gastronomia" || sub === "motel" ? 0.7 :
    sub === "churrascaria" || sub === "buffet" ? 0.65 :
    sub === "restaurante" || sub === "padaria" || sub === "laboratorio" ? 0.5 :
    sub === "food-truck" ? 0.15 : 0.3;
  const pr = r() * 0.6 + pesoPorte * 0.4;
  const porte: Porte = pr > 0.82 ? "DEMAIS" : pr > 0.6 ? "EPP" : pr > 0.28 ? "ME" : "MEI";

  const employees =
    porte === "DEMAIS" ? Math.round(between(r, 45, 180)) :
    porte === "EPP" ? Math.round(between(r, 20, 55)) :
    porte === "ME" ? Math.round(between(r, 6, 22)) :
    Math.round(between(r, 1, 5));

  const capital =
    porte === "DEMAIS" ? Math.round(between(r, 400_000, 3_000_000) / 1000) * 1000 :
    porte === "EPP" ? Math.round(between(r, 100_000, 500_000) / 1000) * 1000 :
    porte === "ME" ? Math.round(between(r, 20_000, 120_000) / 1000) * 1000 :
    Math.round(between(r, 1_000, 15_000) / 500) * 500;

  const anos = between(r, 0.5, 28);
  const openedAt = new Date(Date.now() - anos * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const reviews = Math.round(
    Math.pow(r(), 1.8) * (porte === "DEMAIS" ? 3200 : porte === "EPP" ? 1400 : porte === "ME" ? 500 : 120),
  );
  const rating = reviews === 0 ? null : Math.round(between(r, 3.4, 4.9) * 10) / 10;

  const situacao: SituacaoCadastral = chance(r, 0.94) ? "ATIVA" : chance(r, 0.6) ? "SUSPENSA" : "INAPTA";
  const units = porte === "DEMAIS" && chance(r, 0.5) ? Math.round(between(r, 2, 9)) : chance(r, 0.12) ? 2 : 1;

  const site = chance(r, porte === "MEI" ? 0.25 : 0.7) ? `https://www.${slugify(name)}.com.br` : null;
  const insta = chance(r, 0.85) ? `@${slugify(name)}` : null;
  // Página da empresa no LinkedIn — quanto maior a operação, mais provável.
  // É diferente do perfil pessoal do decisor: serve para achar a lista de
  // funcionários e confirmar quem ocupa o cargo hoje.
  const linkedinEmpresa = chance(r, porte === "DEMAIS" ? 0.9 : porte === "EPP" ? 0.7 : porte === "ME" ? 0.4 : 0.15)
    ? `https://www.linkedin.com/company/${slugify(name)}`
    : null;
  const fone = chance(r, 0.9) ? `(${cidade.ddd}) ${Math.floor(between(r, 3000, 3999))}-${Math.floor(between(r, 1000, 9999))}` : null;
  const zap = chance(r, 0.82) ? `(${cidade.ddd}) 9${Math.floor(between(r, 8000, 9999))}-${Math.floor(between(r, 1000, 9999))}` : null;
  const mail = chance(r, 0.78) ? `${chance(r, 0.5) ? "contato" : "comercial"}@${slugify(name)}.com.br` : null;

  const apps: string[] = [];
  // Delivery só faz sentido em quem vende ao consumidor final.
  const VENDE_AO_PUBLICO = segmentSlug === "food-service" && !["hospital", "escola", "asilo", "industria-refeitorio", "clube", "gastronomia", "cozinha-industrial", "industria-alimenticia", "distribuidor", "revenda-equipamentos", "representante", "industria-farmaceutica", "franquia"].includes(sub);
  if (segmentSlug === "food-service" && VENDE_AO_PUBLICO) {
    if (chance(r, 0.6)) apps.push("iFood");
    if (chance(r, 0.25)) apps.push("Rappi");
    if (chance(r, 0.18)) apps.push("99Food");
  }

  // --- Dados públicos que alimentam o motor de decisores -------------------
  const numSocios = porte === "MEI" ? 1 : Math.max(1, Math.round(between(r, 1, 3.4)));
  const qsa: QsaEntry[] = [];
  for (let s = 0; s < numSocios; s++) {
    const qualificacao =
      porte === "MEI" ? "Empresário Individual" :
      s === 0 ? "Sócio-Administrador" :
      chance(r, 0.45) ? "Sócio-Administrador" : "Sócio";
    qsa.push({
      nome: nomePessoa(r),
      qualificacao,
      entrada: new Date(
        new Date(openedAt).getTime() + between(r, 0, 1) * (Date.now() - new Date(openedAt).getTime()) * 0.4,
      ).toISOString().slice(0, 10),
      participacao: numSocios === 1 ? 100 : Math.round(100 / numSocios),
    });
  }

  const INSTITUCIONAIS = ["hospital", "escola", "asilo", "industria-refeitorio", "cozinha-industrial", "gastronomia"];

  const mentions: WebMention[] = [];
  // Em operação institucional o RT de nutrição costuma ter perfil público
  // (o registro no CRN é obrigatório e a maioria expõe o vínculo no LinkedIn).
  if (INSTITUCIONAIS.includes(sub) && employees >= 10 && chance(r, 0.7)) {
    const pessoa = nomePessoa(r);
    mentions.push({
      nome: pessoa,
      cargo: sub === "gastronomia"
        ? pick(r, ["Coordenadora de Curso de Gastronomia", "Chef Coordenador", "Nutricionista Responsável Técnica"])
        : pick(r, ["Nutricionista Responsável Técnica", "Coordenadora de Nutrição", "Nutricionista Clínica e RT"]),
      fonte: "LinkedIn",
      url: `https://www.linkedin.com/in/${slugify(pessoa)}-${Math.floor(between(r, 10, 99))}`,
      linkedin: `https://www.linkedin.com/in/${slugify(pessoa)}-${Math.floor(between(r, 10, 99))}`,
      vinculo: "explicito",
    });
  }
  // LinkedIn: perfis públicos de compras/A&B aparecem sobretudo em operações
  // com estrutura (a partir de ~20 funcionários) e em redes.
  if (employees >= 20 && chance(r, employees >= 60 ? 0.82 : 0.45)) {
    const cargo =
      sub === "hotel" ? "Gerente de A&B" :
      employees >= 60 ? pick(r, ["Gerente de Compras", "Coordenador de Suprimentos", "Head de Supply Chain"]) :
      pick(r, ["Gerente de Compras", "Gerente de Operações", "Chef Executivo"]);
    const pessoa = nomePessoa(r);
    mentions.push({
      nome: pessoa,
      cargo,
      fonte: "LinkedIn",
      url: `https://www.linkedin.com/in/${slugify(pessoa)}-${Math.floor(between(r, 10, 99))}`,
      linkedin: `https://www.linkedin.com/in/${slugify(pessoa)}-${Math.floor(between(r, 10, 99))}`,
      email: chance(r, 0.25) ? `${slugify(pessoa.split(" ")[0])}.${slugify(pessoa.split(" ")[1])}@${slugify(name)}.com.br` : null,
      vinculo: "explicito",
    });
  }
  // Segundo perfil de LinkedIn em operações grandes (compras + A&B/operações).
  if (employees >= 70 && chance(r, 0.4)) {
    const pessoa = nomePessoa(r);
    mentions.push({
      nome: pessoa,
      cargo: pick(r, ["Diretor de Operações", "Gerente de A&B", "Analista de Suprimentos"]),
      fonte: "LinkedIn",
      url: `https://www.linkedin.com/in/${slugify(pessoa)}-${Math.floor(between(r, 10, 99))}`,
      linkedin: `https://www.linkedin.com/in/${slugify(pessoa)}-${Math.floor(between(r, 10, 99))}`,
      vinculo: chance(r, 0.75) ? "explicito" : "provavel",
    });
  }
  // Site institucional citando o sócio como chef/proprietário.
  if (site && chance(r, 0.35)) {
    mentions.push({
      nome: qsa[0].nome,
      cargo: sub === "restaurante" || sub === "pizzaria" ? "Chef e proprietário" : "Proprietário",
      fonte: "Site oficial",
      url: `${site}/sobre`,
      vinculo: "explicito",
    });
  }

  const records: PublicRecords = { qsa, mentions, employeesEstimate: employees };

  const sources = [
    { label: "Receita Federal — CNPJ e QSA", kind: "cnpj", collectedAt: new Date().toISOString() },
    { label: "OpenStreetMap — endereço e geolocalização", kind: "mapa", collectedAt: new Date().toISOString() },
    ...(reviews ? [{ label: "Avaliações públicas de mapa", kind: "avaliacoes", collectedAt: new Date().toISOString() }] : []),
    ...(mentions.some((m) => m.fonte === "LinkedIn") ? [{ label: "LinkedIn — perfis públicos", kind: "redes", collectedAt: new Date().toISOString() }] : []),
    ...(site ? [{ label: "Site institucional", kind: "web", collectedAt: new Date().toISOString(), url: site }] : []),
  ];

  const jitter = () => between(r, -0.012, 0.012);
  const now = new Date().toISOString();

  return {
    row: {
      id: `${segmentSlug}-${i}`,
      segment_slug: segmentSlug,
      subsegment_slug: sub,
      name,
      // Sufixo da razão social coerente com a atividade — "HOSPITAL X
      // RESTAURANTE LTDA" destoaria na ficha.
      legal_name: `${name.toUpperCase()} ${pick(
        r,
        sub === "hospital" ? ["SERVICOS HOSPITALARES LTDA", "SERVICOS DE SAUDE LTDA"] :
        sub === "escola" || sub === "gastronomia" ? ["INSTITUICAO DE ENSINO LTDA", "EDUCACIONAL LTDA", "CURSOS LIVRES LTDA"] :
        sub === "asilo" ? ["ASSISTENCIA AO IDOSO LTDA", "SERVICOS DE LONGA PERMANENCIA LTDA"] :
        sub === "motel" || sub === "hotel" ? ["HOTELARIA LTDA", "EMPREENDIMENTOS HOTELEIROS LTDA"] :
        sub === "clube" ? ["ASSOCIACAO RECREATIVA", "SOCIEDADE CIVIL SEM FINS LUCRATIVOS"] :
        sub === "supermercado" ? ["COMERCIO DE ALIMENTOS LTDA", "SUPERMERCADOS LTDA"] :
        sub === "industria-refeitorio" || sub === "industria-alimenticia" ? ["INDUSTRIA E COMERCIO LTDA", "INDUSTRIAL LTDA"] :
        sub === "industria-farmaceutica" ? ["INDUSTRIA FARMACEUTICA LTDA", "LABORATORIOS LTDA"] :
        sub === "distribuidor" ? ["DISTRIBUIDORA DE ALIMENTOS LTDA", "COMERCIO ATACADISTA LTDA"] :
        sub === "revenda-equipamentos" ? ["COMERCIO DE EQUIPAMENTOS LTDA", "EQUIPAMENTOS PROFISSIONAIS LTDA"] :
        sub === "representante" ? ["REPRESENTACOES COMERCIAIS LTDA", "REPRESENTACAO E SERVICOS LTDA"] :
        sub === "arquitetura-comercial" || sub === "interiores" || sub === "projetista-cozinha" ? ["ARQUITETURA E PROJETOS LTDA", "PROJETOS E DESIGN LTDA"] :
        sub === "construtora" ? ["CONSTRUTORA E INCORPORADORA LTDA", "ENGENHARIA E CONSTRUCOES LTDA"] :
        sub === "marcenaria" ? ["MARCENARIA E MOVEIS LTDA", "INDUSTRIA DE MOVEIS LTDA"] :
        sub === "consultoria-gastronomica" ? ["CONSULTORIA EMPRESARIAL LTDA", "GESTAO E CONSULTORIA LTDA"] :
        sub === "franquia" ? ["FRANQUEADORA LTDA", "PARTICIPACOES E FRANQUIAS LTDA"] :
        ["COMERCIO DE ALIMENTOS LTDA", "RESTAURANTE LTDA", "ALIMENTACAO EIRELI", "SERVICOS LTDA", "PARTICIPACOES LTDA"],
      )}`,
      cnpj: formatCnpj(r),
      street: pick(r, RUAS),
      number: String(Math.floor(between(r, 12, 2400))),
      neighborhood: bairro.name,
      city: cidade.city,
      uf: cidade.uf,
      zip: `${Math.floor(between(r, 1000, 9999))}${Math.floor(between(r, 100, 999))}-${Math.floor(between(r, 100, 999))}`,
      lat: bairro.lat + jitter(),
      lng: bairro.lng + jitter(),
      phone: fone,
      whatsapp: zap,
      email: mail,
      website: site,
      instagram: insta,
      linkedin: linkedinEmpresa,
      rating,
      reviews_count: reviews,
      price_level: Math.max(1, Math.min(4, Math.round(between(r, 1, 4)))),
      employees_range:
        employees >= 100 ? "100+" : employees >= 50 ? "50-99" : employees >= 20 ? "20-49" : employees >= 6 ? "6-19" : "1-5",
      units_count: units,
      opened_at: openedAt,
      capital_social: capital,
      porte,
      situacao,
      cnae_principal: cnae,
      cnae_principal_desc: CNAE_DESC[cnae] ?? null,
      cnae_secundarios: JSON.stringify(chance(r, 0.4) ? ["5620-1/04", "4721-1/02"].slice(0, 1 + Math.round(r())) : []),
      delivery_apps: JSON.stringify(apps),
      hours:
        sub === "hospital" || sub === "asilo" || sub === "motel"
          ? "24 horas, todos os dias"
          : sub === "escola" || sub === "gastronomia"
            ? pick(r, ["Seg-Sex 07h-22h", "Seg-Sex 07h30-18h · Sáb 08h-12h"])
            : sub === "industria-refeitorio"
              ? pick(r, ["Seg-Sex 06h-18h (3 turnos)", "Seg-Sáb 06h-22h"])
              : segmentSlug === "food-service"
                ? pick(r, ["Seg-Sáb 11h-15h e 18h-23h", "Todos os dias 11h-23h", "Ter-Dom 12h-00h", "Seg-Sex 06h-20h · Sáb 06h-14h"])
                : pick(r, ["Seg-Sex 08h-18h", "Seg-Sáb 07h-19h", "Seg-Sex 09h-20h · Sáb 09h-13h"]),
      sources: JSON.stringify(sources),
      public_records: JSON.stringify(records),
      created_at: now,
      updated_at: now,
    },
  };
}

const COLS = [
  "id", "segment_slug", "subsegment_slug", "name", "legal_name", "cnpj",
  "street", "number", "neighborhood", "city", "uf", "zip", "lat", "lng",
  "phone", "whatsapp", "email", "website", "instagram", "linkedin",
  "rating", "reviews_count", "price_level", "employees_range", "units_count",
  "opened_at", "capital_social", "porte", "situacao",
  "cnae_principal", "cnae_principal_desc", "cnae_secundarios", "delivery_apps",
  "hours", "sources", "public_records", "created_at", "updated_at",
];

/**
 * Popula a base. Idempotente: `ON CONFLICT DO NOTHING` deixa rodar de novo sem
 * duplicar nada. Inserção em lotes — 380 round-trips individuais até o Supabase
 * seriam lentos demais.
 */
export async function seedDatabase(): Promise<{ companies: number; lists: number }> {
  const rows: Record<string, string | number | null>[] = [];
  for (let i = 0; i < 440; i++) rows.push(gerarEmpresa(i, "food-service").row);
  for (let i = 0; i < 130; i++) rows.push(gerarEmpresa(i, "arquitetura").row);
  for (let i = 0; i < 120; i++) rows.push(gerarEmpresa(i, "distribuidores").row);
  for (let i = 0; i < 60; i++) rows.push(gerarEmpresa(i, "saude").row);

  const CHUNK = 40;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const values = chunk.map(() => `(${COLS.map(() => "?").join(",")})`).join(",");
    const params = chunk.flatMap((row) => COLS.map((c) => row[c] ?? null));
    await q(
      `INSERT INTO companies (${COLS.join(",")}) VALUES ${values} ON CONFLICT (id) DO NOTHING`,
      params,
    );
  }

  // Listas de prospecção iniciais, pra tela não nascer vazia.
  const now = new Date().toISOString();
  const listas: [string, string, string][] = [
    ["lst-alta-rotatividade", "Alta rotatividade — SP", "Restaurantes e churrascarias de SP com movimento alto"],
    ["lst-redes", "Redes e multiunidades", "Operações com 2+ unidades — contrato maior, ciclo mais longo"],
  ];
  for (const [id, name, desc] of listas) {
    await q(
      `INSERT INTO lead_lists (id, name, description, segment_slug, created_at)
       VALUES (?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
      [id, name, desc, "food-service", now],
    );
  }

  return { companies: rows.length, lists: listas.length };
}
