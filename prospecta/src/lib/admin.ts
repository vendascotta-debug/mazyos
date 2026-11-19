import type { User } from "@/lib/auth";

/**
 * Quem administra o Prospecta: e-mails em `ADMIN_EMAILS` (separados por
 * vírgula), definida na Vercel. Sem a variável, ninguém é admin.
 */
export function isAdmin(user: Pick<User, "email"> | null | undefined): boolean {
  if (!user?.email) return false;
  const lista = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(user.email.trim().toLowerCase());
}
