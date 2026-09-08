import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { contarPedidosDeSenha, criarPedidoDeSenha, usuarioPorEmail } from "@/lib/repo";
import { emailConfigurado, emailDeRecuperacao, enviarEmail } from "@/lib/email";
import { marcaDoVisitante } from "@/lib/convidado";

// ---------------------------------------------------------------------------
// "Esqueci minha senha" — o pedido.
//
// A regra que manda em tudo aqui: **a resposta é sempre a mesma**, exista ou
// não uma conta com aquele e-mail. Um "esse e-mail não está cadastrado" seria
// um verificador de clientes de graça para quem quisesse sondar a base — e num
// SaaS a lista de quem é cliente já é informação de valor.
//
// Por isso não há status 404 nesta rota, e o tempo de resposta não é usado como
// prova: o e-mail sai depois de responder.
// ---------------------------------------------------------------------------

/**
 * Trinta minutos.
 *
 * Curto o bastante para um link vazado no histórico do navegador ou numa caixa
 * de e-mail compartilhada não valer nada amanhã, e longo o bastante para quem
 * pediu no celular e foi abrir no computador.
 */
const MINUTOS = 30;

/** Pedidos por conta, por hora. Impede transformar a rota em metralhadora. */
const TETO_POR_HORA = 5;

const Corpo = z.object({ email: z.string().trim().email("E-mail inválido.") });

/** O que vai no banco é o hash; o token em texto só existe no e-mail. */
function hashDoToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const resposta = NextResponse.json({
    ok: true,
    mensagem: "Se existir uma conta com esse e-mail, o link de redefinição já está a caminho.",
  });

  const user = await usuarioPorEmail(email);
  if (!user) return resposta;

  const umaHoraAtras = new Date(Date.now() - 3600 * 1000).toISOString();
  if ((await contarPedidosDeSenha(user.id, umaHoraAtras)) >= TETO_POR_HORA) {
    // Também responde igual: dizer "você pediu demais" confirmaria a conta.
    return resposta;
  }

  // 32 bytes de aleatoriedade criptográfica. É o que substitui a senha como
  // prova de identidade, então precisa ser inadivinhável, não só improvável.
  const token = crypto.randomBytes(32).toString("base64url");

  await criarPedidoDeSenha(
    user.id,
    hashDoToken(token),
    new Date(Date.now() + MINUTOS * 60 * 1000).toISOString(),
    marcaDoVisitante(req),
  );

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const link = `${base}/redefinir?token=${encodeURIComponent(token)}`;
  const conteudo = emailDeRecuperacao(user.nome, link, MINUTOS);

  const envio = await enviarEmail({ ...conteudo, para: user.email });
  if (!envio.enviado) {
    // Não conta para o cliente que o envio falhou — isso confirmaria a conta.
    // Mas registra, porque e-mail que não sai é um cliente sem acesso.
    console.error(`[recuperar] falha ao enviar via ${envio.via}: ${envio.erro}`);
  }

  // Só em desenvolvimento, e só enquanto NÃO houver serviço de e-mail: devolve
  // o link na resposta para dar de testar o fluxo inteiro sem caixa de entrada.
  // As duas condições juntas importam — sozinha, a segunda deixaria o link
  // vazando em produção enquanto o e-mail não estivesse configurado, que é
  // exatamente o estado em que o site está hoje.
  if (process.env.NODE_ENV !== "production" && !emailConfigurado()) {
    return NextResponse.json({
      ok: true,
      mensagem: "Se existir uma conta com esse e-mail, o link de redefinição já está a caminho.",
      linkDeTeste: link,
    });
  }

  return resposta;
}
