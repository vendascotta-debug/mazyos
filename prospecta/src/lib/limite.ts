import { q, q1 } from "@/lib/db";

// ---------------------------------------------------------------------------
// Limite de tentativas (força bruta / abuso de formulário), guardado no
// Postgres — na Vercel não há memória compartilhada entre instâncias.
//
// Login: 5 erros por e-mail OU 30 por IP em 15 min → bloqueia até a janela
// passar. Cadastro e formulário de privacidade: N envios por IP por hora.
// ---------------------------------------------------------------------------

export type TipoTentativa = "login" | "cadastro" | "privacidade";

const REGRAS: Record<TipoTentativa, { janelaMin: number; porEmail?: number; porIp: number }> = {
  login: { janelaMin: 15, porEmail: 5, porIp: 30 },
  cadastro: { janelaMin: 60, porIp: 5 },
  privacidade: { janelaMin: 60, porIp: 5 },
};

/** IP do cliente atrás do proxy da Vercel. */
export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "desconhecido").trim().slice(0, 64);
}

/**
 * Devolve quantos minutos faltam para liberar, ou 0 se pode tentar.
 * Conta só falhas no login; no cadastro/privacidade, conta todo envio.
 */
export async function minutosBloqueado(tipo: TipoTentativa, ip: string, email?: string | null): Promise<number> {
  const r = REGRAS[tipo];
  const soFalhas = tipo === "login" ? " AND ok = FALSE" : "";
  const desde = `now() - (? * interval '1 minute')`;

  const [porIp, porEmail] = await Promise.all([
    q1<{ n: number; primeira: string | null }>(
      `SELECT COUNT(*)::int AS n, MIN(created_at)::text AS primeira FROM auth_attempts
       WHERE kind = ? AND ip = ? AND created_at > ${desde}${soFalhas}`,
      [tipo, ip, r.janelaMin],
    ),
    r.porEmail && email
      ? q1<{ n: number; primeira: string | null }>(
          `SELECT COUNT(*)::int AS n, MIN(created_at)::text AS primeira FROM auth_attempts
           WHERE kind = ? AND email = ? AND created_at > ${desde}${soFalhas}`,
          [tipo, email.toLowerCase().trim(), r.janelaMin],
        )
      : Promise.resolve(null),
  ]);

  const estourou = (row: { n: number; primeira: string | null } | null | undefined, max?: number) =>
    row && max != null && Number(row.n) >= max && row.primeira ? row.primeira : null;

  const primeira = estourou(porEmail, r.porEmail) ?? estourou(porIp, r.porIp);
  if (!primeira) return 0;
  const libera = new Date(primeira).getTime() + r.janelaMin * 60_000;
  return Math.max(1, Math.ceil((libera - Date.now()) / 60_000));
}

export async function registrarTentativa(tipo: TipoTentativa, ip: string, email: string | null, ok: boolean) {
  await q("INSERT INTO auth_attempts (kind, email, ip, ok) VALUES (?,?,?,?)", [
    tipo,
    email ? email.toLowerCase().trim() : null,
    ip,
    ok,
  ]);
  // Faxina ocasional: a tabela só precisa do último dia.
  if (Math.random() < 0.02) {
    await q("DELETE FROM auth_attempts WHERE created_at < now() - interval '1 day'");
  }
}

/** Login certo zera as falhas daquele e-mail (o IP continua contando). */
export async function limparFalhas(email: string) {
  await q("DELETE FROM auth_attempts WHERE kind = 'login' AND email = ? AND ok = FALSE", [email.toLowerCase().trim()]);
}
