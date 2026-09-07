import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { nowIso, q, q1, uid } from "@/lib/db";
import type { PlanId, Role, User } from "@/lib/types";
import { ehAdminPorEmail, sincronizarPapel } from "@/lib/admin";

// ---------------------------------------------------------------------------
// Autenticação própria, sem dependência externa.
//
// Senha: scrypt (builtin do Node) com salt por usuário — a senha nunca é
// guardada em texto. Sessão: cookie assinado com HMAC-SHA256, httpOnly, sem
// estado no servidor (não precisa de tabela de sessões nem Redis).
//
// Padrão herdado do Prospecta, que já roda em produção com isolamento entre
// contas confirmado.
// ---------------------------------------------------------------------------

export { SESSION_COOKIE } from "@/lib/session-cookie";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET não configurado (mínimo 16 caracteres). Defina no .env.local e nas variáveis da Vercel.",
    );
  }
  return s;
}

// --- Senha -----------------------------------------------------------------

export function hashPassword(senha: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(senha, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(senha: string, armazenado: string | null): boolean {
  if (!armazenado) return false;
  const [algo, salt, hash] = armazenado.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const teste = crypto.scryptSync(senha, salt, 64);
  const guardado = Buffer.from(hash, "hex");
  // timingSafeEqual exige mesmo tamanho — a comparação em tempo constante
  // impede descobrir a senha medindo o tempo de resposta.
  if (teste.length !== guardado.length) return false;
  return crypto.timingSafeEqual(teste, guardado);
}

// --- Sessão ----------------------------------------------------------------

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const expira = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  const payload = `${userId}.${expira}`;
  return `${payload}.${sign(payload)}`;
}

/** Valida assinatura e validade. Devolve o id do usuário, ou null. */
export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [userId, expiraStr, assinatura] = partes;
  const payload = `${userId}.${expiraStr}`;

  const esperada = Buffer.from(sign(payload));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length) return null;
  if (!crypto.timingSafeEqual(esperada, recebida)) return null;

  const expira = Number(expiraStr);
  if (!Number.isFinite(expira) || Date.now() > expira) return null;

  return userId;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

// --- Usuário ---------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  plan: string;
  onboarded: number;
  created_at: string;
}

function toUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    avatarUrl: r.avatar_url,
    role: (r.role as Role) ?? "user",
    plan: (r.plan as PlanId) ?? "free",
    onboarded: Boolean(r.onboarded),
    createdAt: r.created_at,
  };
}

/** Usuário da requisição atual, ou null. Nunca lança por falta de sessão. */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const row = await q1<UserRow>("SELECT * FROM users WHERE id = ?", [userId]);
  return row ? toUser(row) : null;
}

/**
 * Igual ao `currentUser`, mas manda pro login em vez de devolver null.
 * É o que as páginas de `/app` usam — a proteção não depende só do middleware.
 */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/entrar");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/app");
  return user;
}

// --- Cadastro e login ------------------------------------------------------

export async function emailEmUso(email: string): Promise<boolean> {
  const r = await q1("SELECT 1 AS x FROM users WHERE email = ?", [email.toLowerCase().trim()]);
  return Boolean(r);
}

export async function criarUsuario(dados: {
  nome: string;
  email: string;
  senha: string;
}): Promise<User> {
  const id = uid("u_");
  const email = dados.email.toLowerCase().trim();
  await q(
    `INSERT INTO users (id, email, name, password_hash, role, plan, onboarded, created_at)
     VALUES (?, ?, ?, ?, ?, 'free', 0, ?)`,
    [id, email, dados.nome.trim(), hashPassword(dados.senha), ehAdminPorEmail(email) ? 'admin' : 'user', nowIso()],
  );
  const row = await q1<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
  return toUser(row!);
}

/** Devolve o usuário se e-mail e senha conferem. Null em qualquer outro caso. */
export async function autenticar(email: string, senha: string): Promise<User | null> {
  const row = await q1<UserRow & { password_hash: string | null }>(
    "SELECT * FROM users WHERE email = ?",
    [email.toLowerCase().trim()],
  );
  if (!row) return null;
  if (!verifyPassword(senha, row.password_hash)) return null;

  // O primeiro admin nasce daqui: sem isso ninguem conseguiria abrir o painel
  // pela primeira vez (precisa ser admin para promover alguem a admin).
  const papel = await sincronizarPapel(row.id, row.email, row.role);
  return toUser({ ...row, role: papel });
}

export async function marcarOnboardingConcluido(userId: string): Promise<void> {
  await q("UPDATE users SET onboarded = 1 WHERE id = ?", [userId]);
}
