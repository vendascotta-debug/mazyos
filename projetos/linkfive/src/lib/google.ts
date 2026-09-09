import crypto from "node:crypto";
import { cookies } from "next/headers";
import { assinarHmac, assinaturaConfere } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Entrar com o Google.
//
// OAuth 2.0 na mão, sem biblioteca. São duas chamadas HTTP e um JWT para ler —
// trazer um framework de autenticação inteiro para isso obrigaria a reescrever
// a sessão que já existe e já roda em produção.
//
// O caminho:
//   /api/auth/google           → manda o visitante para o Google
//   /api/auth/google/callback  → recebe o código, troca por token, entra
//
// O `state` é o que impede um terceiro de forjar o retorno: ele é sorteado
// aqui, guardado num cookie assinado e conferido na volta. Sem isso, alguém
// poderia induzir seu navegador a completar um login que ele começou.
// ---------------------------------------------------------------------------

const AUTORIZACAO = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";

/** O cookie do `state` vive só o tempo de ir ao Google e voltar. */
const COOKIE_ESTADO = "linkfive_oauth";
const MINUTOS = 10;

/**
 * O ID do cliente não é segredo — ele aparece na própria URL do Google.
 * Por isso é `NEXT_PUBLIC_`: a tela de login usa a mesma variável para decidir
 * se mostra o botão, e um botão que aparece antes das credenciais existirem só
 * levaria o visitante a um erro.
 */
export function googleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}

function googleSecret(): string | null {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || null;
}

export function googleConfigurado(): boolean {
  return Boolean(googleClientId() && googleSecret());
}

export function enderecoDeRetorno(req: Request): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  return `${base}/api/auth/google/callback`;
}

// --- Ida ---------------------------------------------------------------

/**
 * Monta o endereço do Google e guarda o `state` no cookie.
 *
 * `destino` volta junto no state para o visitante cair onde ele estava
 * tentando entrar, e não sempre no painel.
 */
export async function iniciarLoginGoogle(req: Request, destino: string | null): Promise<string> {
  const nonce = crypto.randomBytes(16).toString("base64url");
  // Só caminho interno: um `destino` absoluto viraria redirecionamento aberto,
  // que é prato feito para phishing em cima do nosso domínio.
  const seguro = destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : "";
  const payload = `${nonce}|${seguro}`;

  const jar = await cookies();
  jar.set(COOKIE_ESTADO, `${payload}.${assinarHmac(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MINUTOS * 60,
  });

  const params = new URLSearchParams({
    client_id: googleClientId()!,
    redirect_uri: enderecoDeRetorno(req),
    response_type: "code",
    scope: "openid email profile",
    state: nonce,
    // `select_account` para quem tem mais de uma conta Google não entrar na
    // errada sem perceber — e no celular isso é o caso comum.
    prompt: "select_account",
  });

  return `${AUTORIZACAO}?${params}`;
}

/** Confere o `state` da volta e devolve para onde o visitante ia. */
export async function conferirEstado(recebido: string): Promise<{ ok: boolean; destino: string }> {
  const jar = await cookies();
  const valor = jar.get(COOKIE_ESTADO)?.value;
  jar.delete(COOKIE_ESTADO);

  if (!valor) return { ok: false, destino: "" };

  const corte = valor.lastIndexOf(".");
  if (corte < 1) return { ok: false, destino: "" };

  const payload = valor.slice(0, corte);
  if (!assinaturaConfere(payload, valor.slice(corte + 1))) return { ok: false, destino: "" };

  const [nonce, destino = ""] = payload.split("|");

  // Comparação em tempo constante: o `state` é um segredo de curta duração.
  const a = Buffer.from(nonce);
  const b = Buffer.from(recebido);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, destino: "" };
  }

  return { ok: true, destino };
}

// --- Volta -------------------------------------------------------------

export interface ContaGoogle {
  /** O `sub` do Google: identificador estável, não muda se o e-mail mudar. */
  id: string;
  email: string;
  nome: string;
  foto: string | null;
}

/**
 * Troca o código pelo token e devolve quem é a pessoa.
 *
 * O `id_token` é um JWT, mas chega numa resposta direta do servidor do Google,
 * por HTTPS, numa conexão que nós abrimos. Isso já garante a origem — o que
 * conferimos aqui é o conteúdo: se o token foi emitido para ESTE aplicativo
 * (`aud`), se veio do Google (`iss`) e se o e-mail é verificado.
 *
 * O `email_verified` é o mais importante dos três. Sem ele, uma conta Google
 * com o e-mail de outra pessoa entraria na conta dela aqui dentro.
 */
export async function trocarCodigoPorConta(
  req: Request,
  codigo: string,
): Promise<{ ok: true; conta: ContaGoogle } | { ok: false; erro: string }> {
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: googleClientId()!,
      client_secret: googleSecret()!,
      redirect_uri: enderecoDeRetorno(req),
      grant_type: "authorization_code",
    }),
  }).catch(() => null);

  if (!r || !r.ok) {
    const detalhe = r ? await r.text().catch(() => "") : "sem resposta";
    return { ok: false, erro: `troca de código falhou: ${detalhe.slice(0, 200)}` };
  }

  const dados = (await r.json().catch(() => null)) as { id_token?: string } | null;
  if (!dados?.id_token) return { ok: false, erro: "o Google não devolveu id_token" };

  const partes = dados.id_token.split(".");
  if (partes.length !== 3) return { ok: false, erro: "id_token com formato inesperado" };

  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
  } catch {
    return { ok: false, erro: "id_token ilegível" };
  }

  if (corpo.aud !== googleClientId()) {
    return { ok: false, erro: "o token foi emitido para outro aplicativo" };
  }
  const iss = String(corpo.iss ?? "");
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
    return { ok: false, erro: "emissor inesperado" };
  }
  // Vem como booleano ou como a string "true", dependendo do caso.
  if (corpo.email_verified !== true && corpo.email_verified !== "true") {
    return { ok: false, erro: "e-mail não verificado no Google" };
  }

  const email = String(corpo.email ?? "").toLowerCase().trim();
  const sub = String(corpo.sub ?? "");
  if (!email || !sub) return { ok: false, erro: "token sem e-mail ou identificador" };

  return {
    ok: true,
    conta: {
      id: sub,
      email,
      nome: String(corpo.name ?? "").trim() || email.split("@")[0],
      foto: corpo.picture ? String(corpo.picture) : null,
    },
  };
}
