import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Login com Google (OAuth 2.0, fluxo de código de autorização).
//
// Sem biblioteca: são duas chamadas HTTP e uma verificação de `state`. O token
// vem direto do Google por TLS, então não precisamos validar assinatura de JWT.
// ---------------------------------------------------------------------------

export const GOOGLE_STATE_COOKIE = "prospecta_oauth_state";

/**
 * Lê variável de ambiente sem espaço nem quebra de linha nas pontas.
 *
 * Colar valor num painel web quase sempre traz uma quebra de linha junto, e o
 * Google recusa um client_id terminado em %0A — um erro que só aparece na hora
 * de logar, com mensagem que não ajuda em nada.
 */
const env = (nome: string): string | undefined => process.env[nome]?.trim() || undefined;

const CLIENT_ID = () => env("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = () => env("GOOGLE_CLIENT_SECRET");

export function googleConfigurado(): boolean {
  return Boolean(CLIENT_ID() && CLIENT_SECRET());
}

/** URL de callback registrada no Google Cloud. */
export function redirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function novoState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function urlDeAutorizacao(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID()!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    // Sempre mostrar o seletor de conta: quem tem mais de um Gmail precisa
    // escolher, em vez de entrar automaticamente na conta errada.
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export interface PerfilGoogle {
  googleId: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export async function trocarCodigoPorPerfil(code: string, origin: string): Promise<PerfilGoogle> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID()!,
      client_secret: CLIENT_SECRET()!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google recusou a troca do código (${tokenRes.status}). Confira o Client ID/Secret e a URI de redirecionamento.`);
  }
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("Google não devolveu token de acesso.");

  const perfilRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${access_token}` },
  });
  if (!perfilRes.ok) throw new Error("Não foi possível ler o perfil no Google.");

  const p = (await perfilRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!p.email) throw new Error("A conta Google não expôs um e-mail.");
  if (p.email_verified === false) throw new Error("Esse e-mail do Google não está verificado.");

  return {
    googleId: p.sub,
    email: p.email,
    name: p.name ?? null,
    avatar: p.picture ?? null,
  };
}
