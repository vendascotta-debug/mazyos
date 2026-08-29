import fs from "node:fs";
import path from "node:path";
import { consultar, estimarCusto } from "./bigquery.mjs";

// ---------------------------------------------------------------------------
// Importa empresas REAIS da base de CNPJ da Receita Federal (via Base dos
// Dados, no BigQuery) para o banco do Prospecta.
//
//   node --experimental-strip-types scripts/importar-cnpj.mjs contar
//   node --experimental-strip-types scripts/importar-cnpj.mjs importar
//
// A base de demonstração continua existindo em src/lib/seed.ts; este script é
// o caminho para dados de verdade.
// ---------------------------------------------------------------------------

const SNAPSHOT = "2026-01-11"; // versão mais recente publicada
const UF = "SP";
const ATIVA = "2"; // codigo da Receita para situacao cadastral ativa

// --- CNAE -> subsegmento ---------------------------------------------------
// A fonte da verdade continua sendo src/lib/segments/*.ts; aqui traduzimos os
// CNAEs de lá (com pontuação) para o formato da Receita (só dígitos).
async function mapaCnae() {
  // Lemos os arquivos de configuração como texto: o Node roda TypeScript, mas
  // não resolve os imports sem extensão usados pelo Next. Extrair daqui evita
  // manter uma segunda lista de CNAEs que sairia de sincronia em silêncio.
  const dir = path.join(process.cwd(), "src", "lib", "segments");
  const arquivos = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && !["index.ts", "types.ts"].includes(f));

  const mapa = new Map();
  for (const arquivo of arquivos) {
    const src = fs.readFileSync(path.join(dir, arquivo), "utf8");
    const segmento = src.match(/slug:\s*"([^"]+)"/)?.[1];
    if (!segmento) continue;

    // Só o bloco `subsegments: [ ... ]`, para não confundir com decisionRoles.
    const inicio = src.indexOf("subsegments:");
    const fim = src.indexOf("decisionRoles:");
    const bloco = src.slice(inicio, fim > inicio ? fim : undefined);

    const re = /slug:\s*"([^"]+)"[\s\S]*?cnaes:\s*\[([\s\S]*?)\]/g;
    let m;
    while ((m = re.exec(bloco))) {
      const sub = m[1];
      for (const cnae of m[2].match(/"([^"]+)"/g) ?? []) {
        const limpo = cnae.replace(/\D/g, "");
        // Primeiro subsegmento que reivindica o CNAE fica com ele: a ordem em
        // segments/*.ts define a prioridade (restaurante antes de pizzaria).
        if (limpo && !mapa.has(limpo)) mapa.set(limpo, { segmento, subsegmento: sub });
      }
    }
  }
  return mapa;
}

// Qualificações do quadro societário mais comuns (tabela da Receita).
const QUALIFICACAO = {
  "05": "Administrador",
  "08": "Conselheiro de Administração",
  "10": "Diretor",
  "16": "Presidente",
  "17": "Procurador",
  "20": "Sociedade Consorciada",
  "22": "Sócio",
  "23": "Sócio Capitalista",
  "24": "Sócio Comanditado",
  "28": "Sócio-Gerente",
  "29": "Sócio Incapaz ou Relativamente Incapaz",
  "30": "Sócio Menor",
  "31": "Sócio Ostensivo",
  "37": "Sócio Pessoa Jurídica Domiciliado no Exterior",
  "38": "Sócio Pessoa Física Residente ou Domiciliado no Exterior",
  "39": "Diretor Presidente",
  "49": "Sócio-Administrador",
  "52": "Sócio com Capital",
  "54": "Fundador",
  "59": "Produtor Rural",
  "65": "Titular Pessoa Física Residente ou Domiciliado no Brasil",
  "78": "Titular Pessoa Física Residente ou Domiciliado no Exterior",
};

// A Receita publica o porte sem zero a esquerda: 1 = micro, 3 = pequena, 5 = demais.
const PORTE = { "1": "ME", "3": "EPP", "5": "DEMAIS", "01": "ME", "03": "EPP", "05": "DEMAIS" };

function sqlBase(cnaes) {
  const lista = cnaes.map((c) => `'${c}'`).join(",");
  return `
    WITH est AS (
      SELECT
        cnpj, cnpj_basico, nome_fantasia, data_inicio_atividade,
        cnae_fiscal_principal, cnae_fiscal_secundaria, id_municipio,
        tipo_logradouro, logradouro, numero, complemento, bairro, cep,
        ddd_1, telefone_1, ddd_2, telefone_2, email, identificador_matriz_filial
      FROM \`basedosdados.br_me_cnpj.estabelecimentos\`
      WHERE data = '${SNAPSHOT}'
        AND sigla_uf = '${UF}'
        AND situacao_cadastral = '2'
        AND cnae_fiscal_principal IN (${lista})
    ),
    emp AS (
      SELECT cnpj_basico, razao_social, capital_social, porte
      FROM \`basedosdados.br_me_cnpj.empresas\`
      WHERE data = '${SNAPSHOT}'
    ),
    soc AS (
      SELECT cnpj_basico,
             TO_JSON_STRING(ARRAY_AGG(
               STRUCT(nome, qualificacao, data_entrada_sociedade AS entrada)
               ORDER BY data_entrada_sociedade LIMIT 4
             )) AS socios
      FROM \`basedosdados.br_me_cnpj.socios\`
      WHERE data = '${SNAPSHOT}'
      GROUP BY cnpj_basico
    ),
    mun AS (
      SELECT id_municipio, nome,
             ST_Y(ST_CENTROID(geometria)) AS lat,
             ST_X(ST_CENTROID(geometria)) AS lng
      FROM \`basedosdados.br_geobr_mapas.municipio\`
      WHERE sigla_uf = '${UF}'
    )
    SELECT
      est.cnpj, est.cnpj_basico, est.nome_fantasia, emp.razao_social,
      emp.capital_social, emp.porte, est.data_inicio_atividade,
      est.cnae_fiscal_principal, est.cnae_fiscal_secundaria,
      est.tipo_logradouro, est.logradouro, est.numero, est.complemento,
      est.bairro, est.cep, est.ddd_1, est.telefone_1, est.ddd_2, est.telefone_2,
      est.email, est.identificador_matriz_filial,
      mun.nome AS municipio, mun.lat, mun.lng,
      soc.socios
    FROM est
    LEFT JOIN emp ON emp.cnpj_basico = est.cnpj_basico
    LEFT JOIN soc ON soc.cnpj_basico = est.cnpj_basico
    LEFT JOIN mun ON mun.id_municipio = est.id_municipio
  `;
}

async function contar() {
  const mapa = await mapaCnae();
  const cnaes = [...mapa.keys()];
  const lista = cnaes.map((c) => `'${c}'`).join(",");

  const sql = `
    SELECT cnae_fiscal_principal AS cnae, COUNT(*) AS n
    FROM \`basedosdados.br_me_cnpj.estabelecimentos\`
    WHERE data = '${SNAPSHOT}' AND sigla_uf = '${UF}'
      AND situacao_cadastral = '2'
      AND cnae_fiscal_principal IN (${lista})
    GROUP BY 1 ORDER BY n DESC
  `;

  const custo = await estimarCusto(sql);
  console.log(`Custo da varredura: ${custo.gb} GB (franquia gratuita: 1024 GB/mês)\n`);

  const linhas = await consultar(sql);
  let total = 0;
  const porSegmento = new Map();
  for (const l of linhas) {
    const n = Number(l.n);
    total += n;
    const alvo = mapa.get(l.cnae);
    const chave = alvo ? `${alvo.segmento} / ${alvo.subsegmento}` : `? ${l.cnae}`;
    porSegmento.set(chave, (porSegmento.get(chave) ?? 0) + n);
  }

  console.log(`EMPRESAS ATIVAS EM ${UF} NOS NOSSOS CNAES: ${total.toLocaleString("pt-BR")}\n`);
  for (const [k, v] of [...porSegmento.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(8)}  ${k}`);
  }

  const mb = ((total * 420) / 1024 ** 2).toFixed(0);
  console.log(`\nEspaço estimado no banco: ~${mb} MB (limite do Neon gratuito: 512 MB)`);
}

export { sqlBase, mapaCnae, QUALIFICACAO, PORTE, SNAPSHOT, UF };

const comando = process.argv[2];
if (comando === "contar") {
  contar().catch((e) => {
    console.error("ERRO:", e.message);
    process.exit(1);
  });
}
