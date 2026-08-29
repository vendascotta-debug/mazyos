import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Cliente mínimo do BigQuery, sem dependências.
//
// O SDK oficial traria dezenas de pacotes para fazer o que aqui são três
// chamadas HTTP: assinar um JWT com a chave da conta de serviço, trocá-lo por
// um access token e consultar. `node:crypto` assina RS256 nativamente.
// ---------------------------------------------------------------------------

const KEY_PATH = path.join(process.cwd(), "google-bigquery.json");

function credenciais() {
  if (!fs.existsSync(KEY_PATH)) {
    throw new Error(
      `Chave do BigQuery não encontrada em ${KEY_PATH}. Baixe o JSON da conta de serviço no Google Cloud e salve com esse nome.`,
    );
  }
  return JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

let tokenCache = { valor: null, expira: 0 };

async function accessToken() {
  if (tokenCache.valor && Date.now() < tokenCache.expira - 60_000) return tokenCache.valor;

  const cred = credenciais();
  const agora = Math.floor(Date.now() / 1000);
  const claim = {
    iss: cred.client_email,
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    exp: agora + 3600,
    iat: agora,
  };

  const cabecalho = b64({ alg: "RS256", typ: "JWT" });
  const corpo = b64(claim);
  const assinatura = crypto
    .createSign("RSA-SHA256")
    .update(`${cabecalho}.${corpo}`)
    .sign(cred.private_key, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cabecalho}.${corpo}.${assinatura}`,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao autenticar no Google: ${res.status} ${await res.text()}`);

  const j = await res.json();
  tokenCache = { valor: j.access_token, expira: Date.now() + j.expires_in * 1000 };
  return tokenCache.valor;
}

/**
 * Executa SQL e devolve as linhas já convertidas em objetos.
 * Pagina sozinho até o fim do resultado.
 */
export async function consultar(sql, { maxLinhas = 200_000, dryRun = false } = {}) {
  const cred = credenciais();
  const token = await accessToken();
  const base = `https://bigquery.googleapis.com/bigquery/v2/projects/${cred.project_id}`;

  const res = await fetch(`${base}/queries`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      dryRun,
      timeoutMs: 120_000,
      maxResults: 5_000,
      // Base dos Dados fica em us-central1 / US.
      location: "US",
    }),
  });

  const j = await res.json();
  if (!res.ok) throw new Error(`BigQuery: ${j.error?.message ?? res.status}`);
  if (dryRun) {
    const bytes = Number(j.totalBytesProcessed ?? 0);
    return { bytes, gb: (bytes / 1024 ** 3).toFixed(2) };
  }

  const campos = j.schema?.fields?.map((f) => f.name) ?? [];
  const linhas = [];
  const empurrar = (rows = []) => {
    for (const r of rows) {
      const o = {};
      r.f.forEach((celula, i) => (o[campos[i]] = celula.v));
      linhas.push(o);
    }
  };
  empurrar(j.rows);

  let pagina = j.pageToken;
  const jobId = j.jobReference?.jobId;
  while (pagina && linhas.length < maxLinhas) {
    const p = new URLSearchParams({ pageToken: pagina, maxResults: "5000", location: "US" });
    const r2 = await fetch(`${base}/queries/${jobId}?${p}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const j2 = await r2.json();
    if (!r2.ok) throw new Error(`BigQuery (paginação): ${j2.error?.message ?? r2.status}`);
    empurrar(j2.rows);
    pagina = j2.pageToken;
    process.stdout.write(`\r   ${linhas.length.toLocaleString("pt-BR")} linhas...`);
  }
  if (pagina) process.stdout.write(`\r   ${linhas.length.toLocaleString("pt-BR")} linhas (limite atingido)\n`);
  else if (linhas.length > 5000) process.stdout.write(`\r   ${linhas.length.toLocaleString("pt-BR")} linhas\n`);

  return linhas;
}

/** Custo estimado antes de rodar de verdade — a franquia é 1 TB/mês. */
export async function estimarCusto(sql) {
  return consultar(sql, { dryRun: true });
}
