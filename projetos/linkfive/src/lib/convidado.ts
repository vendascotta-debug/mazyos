import crypto from "node:crypto";
import { cookies } from "next/headers";
import { assinarHmac, assinaturaConfere } from "@/lib/auth";

// ---------------------------------------------------------------------------
// O visitante que ainda não tem conta.
//
// Ele encurta na landing, o link funciona de verdade, e o que ele acabou de
// criar precisa sobreviver até o cadastro — senão o "criar conta e salvar o
// link" seria mentira, e ele perderia justamente a coisa que o convenceu.
//
// Guardar isso no cookie, e não na tela, é o que faz o link atravessar a
// navegação: ele encurta, lê os planos, volta, cadastra — e o link continua
// lá. O cookie é httpOnly e assinado com o mesmo HMAC da sessão: quem editar
// o valor à mão não consegue reivindicar um link que não criou.
// ---------------------------------------------------------------------------

export const COOKIE_CONVIDADO = "linkfive_convidado";

/** 30 dias: o mesmo prazo de vida do link órfão. Guardar mais não serve. */
const DIAS = 30;

/**
 * Quantos links um visitante carrega até o cadastro.
 *
 * Cinco é o suficiente para quem testou o produto algumas vezes numa sessão.
 * Sem teto, o cookie cresceria sem limite e voltaria em cada requisição.
 */
const MAX_IDS = 5;

function ler(jarValue: string | undefined): string[] {
  if (!jarValue) return [];
  const corte = jarValue.lastIndexOf(".");
  if (corte < 1) return [];

  const payload = jarValue.slice(0, corte);
  if (!assinaturaConfere(payload, jarValue.slice(corte + 1))) return [];

  return payload.split(",").filter(Boolean).slice(0, MAX_IDS);
}

/** Ids que o visitante já criou nesta máquina. */
export async function curtosDoConvidado(): Promise<string[]> {
  const jar = await cookies();
  return ler(jar.get(COOKIE_CONVIDADO)?.value);
}

/** Acrescenta um id ao cookie, mantendo os mais recentes na frente. */
export async function lembrarCurtoDoConvidado(id: string): Promise<void> {
  const jar = await cookies();
  const atuais = ler(jar.get(COOKIE_CONVIDADO)?.value).filter((x) => x !== id);
  const payload = [id, ...atuais].slice(0, MAX_IDS).join(",");

  jar.set(COOKIE_CONVIDADO, `${payload}.${assinarHmac(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS * 24 * 3600,
  });
}

/** Some com o cookie depois que os links já foram adotados por uma conta. */
export async function esquecerConvidado(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_CONVIDADO);
}

/**
 * Identificador do visitante para o limite por hora.
 *
 * É o IP passado pelo HMAC: serve para contar sem guardar de quem é. Um
 * encurtador sem freio nenhum vira ferramenta de phishing hospedada no nosso
 * domínio, e quem paga o preço é a reputação do `linkfive.com.br` nos filtros
 * de spam.
 */
export function marcaDoVisitante(req: Request): string {
  // `x-real-ip` vem primeiro porque na Vercel é o cabeçalho que a borda
  // escreve. O `x-forwarded-for` é uma lista à qual o cliente também pode
  // acrescentar, então só o primeiro item serve, e só como segunda opção.
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "desconhecido";
  return crypto.createHash("sha256").update(assinarHmac(ip)).digest("hex").slice(0, 32);
}

/**
 * Quantos links um mesmo visitante cria por hora sem ter conta.
 *
 * Trinta, e não dez: operadora de celular e rede de escritório colocam muita
 * gente atrás do mesmo IP, e um teto baixo barraria quem nunca abusou. Trinta
 * ainda está longe de servir para uma operação de spam — e o que não for
 * adotado morre em 30 dias de qualquer jeito.
 */
export const TETO_POR_HORA = 30;
