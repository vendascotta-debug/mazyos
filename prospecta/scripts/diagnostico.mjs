import { consultar } from "./bigquery.mjs";
import { mapaCnae, SNAPSHOT, UF } from "./importar-cnpj.mjs";

const mapa = await mapaCnae();
console.log(`CNAEs mapeados da configuração: ${mapa.size}`);
console.log("  exemplos:", [...mapa.entries()].slice(0, 5).map(([c, v]) => `${c}=${v.subsegmento}`).join(", "));

const t = "`basedosdados.br_me_cnpj.estabelecimentos`";

console.log("\n1) snapshots recentes:");
console.log(await consultar(`SELECT data, COUNT(*) n FROM ${t} GROUP BY 1 ORDER BY 1 DESC LIMIT 3`));

console.log(`\n2) linhas em ${UF} no snapshot ${SNAPSHOT}:`);
console.log(await consultar(`SELECT COUNT(*) n FROM ${t} WHERE data='${SNAPSHOT}' AND sigla_uf='${UF}'`));

console.log("\n3) valores de situacao_cadastral:");
console.log(await consultar(`SELECT situacao_cadastral, COUNT(*) n FROM ${t} WHERE data='${SNAPSHOT}' AND sigla_uf='${UF}' GROUP BY 1 ORDER BY n DESC LIMIT 6`));

console.log("\n4) formato do cnae_fiscal_principal (amostra):");
console.log(await consultar(`SELECT cnae_fiscal_principal, COUNT(*) n FROM ${t} WHERE data='${SNAPSHOT}' AND sigla_uf='${UF}' GROUP BY 1 ORDER BY n DESC LIMIT 6`));
