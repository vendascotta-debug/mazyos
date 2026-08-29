import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { nowIso, q, q1, uid } from "@/lib/db";

// ---------------------------------------------------------------------------
// Autenticação própria, sem dependência externa.
//
// Senha: scrypt (builtin do Node) com salt por usuário — nunca guardamos a
// senha em texto. Sessão: cookie assinado com HMAC-SHA256, httpOnly, sem
// estado no servidor (não precisa de tabela de sessões nem Redis).
// ---------------------------------------------------------------------------

export { SESSION_COOKIE } from "@/lib/session-cookie";
import { SESSION_COOKIE } from "@/lib/session-cookie";
const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
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

export function verifyPassword(senha: string, armazenado: string): boolean {
  const [algo, salt, hash] = armazenado.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const teste = crypto.scryptSync(senha, salt, 64);
  const guardado = Buffer.from(hash, "hex");
  // timingSafeEqual exige mesmo tamanho — comparação constante evita
  // descobrir a senha medindo o tempo de resposta.
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

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [userId, expira, assinatura] = partes;
  const payload = `${userId}.${expira}`;
  const esperado = sign(payload);
  if (assinatura.length !== esperado.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperado))) return null;
  if (Number(expira) < Date.now()) return null;
  return userId;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 3600,
};

// --- Usuários --------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

const NORMALIZE_EMAIL = (e: string) => e.trim().toLowerCase();

export async function createUser(email: string, senha: string, nome: string | null): Promise<User> {
  const mail = NORMALIZE_EMAIL(email);
  const existe = await q1<{ id: string }>("SELECT id FROM users WHERE email = ?", [mail]);
  if (existe) throw new Error("Já existe uma conta com esse e-mail.");

  const id = uid("usr-");
  const criado = nowIso();
  await q("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?,?,?,?,?)", [
    id,
    mail,
    nome,
    hashPassword(senha),
    criado,
  ]);
  return { id, email: mail, name: nome, createdAt: criado };
}

export async function authenticate(email: string, senha: string): Promise<User | null> {
  const row = await q1<{ id: string; email: string; name: string | null; password_hash: string; created_at: string }>(
    "SELECT * FROM users WHERE email = ?",
    [NORMALIZE_EMAIL(email)],
  );
  if (!row) return null;
  if (!verifyPassword(senha, row.password_hash)) return null;
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

/** Usuário da requisição atual, ou null se não estiver logado. */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const row = await q1<{ id: string; email: string; name: string | null; created_at: string }>(
    "SELECT id, email, name, created_at FROM users WHERE id = ?",
    [userId],
  );
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

/** Usa nas páginas: garante sessão válida ou manda para o login. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/entrar");
  return user;
}

/** Usa nas rotas de API: devolve null em vez de redirecionar. */
export async function apiUser(): Promise<User | null> {
  return currentUser();
}
