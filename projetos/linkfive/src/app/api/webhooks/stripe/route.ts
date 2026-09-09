import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  concederPlano,
  emailPorIdDaPlataforma,
  mapaPrecosStripe,
  marcarProcessado,
  registrarEvento,
  revogarPlano,
} from "@/lib/cobranca";
import type { PlanId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Webhook do Stripe.
//
// Diferente do webhook do Lastlink, aqui o formato é conhecido e documentado —
// então em vez de adivinhar nomes de campo, tratamos eventos específicos.
//
// A assinatura é conferida na mão, com node:crypto, em vez de trazer o SDK do
// Stripe. São vinte linhas contra um pacote inteiro no bundle, e a receita está
// publicada: HMAC-SHA256 de `timestamp.corpo`, comparado ao `v1` do cabeçalho.
//
// O CORPO PRECISA SER LIDO CRU. Qualquer reserialização (um JSON.parse seguido
// de JSON.stringify) muda um espaço que seja e a assinatura não fecha mais.
// ---------------------------------------------------------------------------

/** Tolerância de relógio. Cinco minutos é o que o próprio Stripe recomenda. */
const JANELA_SEGUNDOS = 300;

/**
 * Confere a assinatura do Stripe.
 *
 * Sem isso, qualquer um que descobrisse o endereço poderia liberar plano pago
 * mandando um POST. A checagem de tempo importa tanto quanto a de assinatura:
 * sem ela, um evento legítimo capturado hoje poderia ser reenviado amanhã.
 */
function assinaturaValida(corpo: string, cabecalho: string | null, segredo: string): boolean {
  if (!cabecalho) return false;

  let t = "";
  const assinaturas: string[] = [];
  for (const parte of cabecalho.split(",")) {
    const [chave, valor] = parte.split("=").map((x) => x.trim());
    if (chave === "t") t = valor;
    if (chave === "v1" && valor) assinaturas.push(valor);
  }
  if (!t || assinaturas.length === 0) return false;

  const idade = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(idade) || idade > JANELA_SEGUNDOS) return false;

  const esperada = crypto.createHmac("sha256", segredo).update(`${t}.${corpo}`).digest("hex");
  const a = Buffer.from(esperada);

  // O Stripe pode mandar mais de uma assinatura durante a troca de segredo.
  return assinaturas.some((s) => {
    const b = Buffer.from(s);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

/** Procura o e-mail em qualquer um dos lugares onde o Stripe costuma pôr. */
function emailDoEvento(objeto: Record<string, unknown>): string | null {
  const det = objeto.customer_details as { email?: string } | undefined;
  const candidatos = [
    det?.email,
    objeto.customer_email,
    (objeto.customer as { email?: string } | undefined)?.email,
  ];
  for (const c of candidatos) {
    if (typeof c === "string" && c.includes("@")) return c.toLowerCase().trim();
  }
  return null;
}

/** Id do cliente no Stripe (`cus_...`), venha como texto ou objeto. */
function idDoCliente(objeto: Record<string, unknown>): string | null {
  const c = objeto.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && typeof (c as { id?: string }).id === "string") {
    return (c as { id: string }).id;
  }
  return null;
}

/** Qual plano, a partir do preço assinado. */
function planoDaAssinatura(objeto: Record<string, unknown>): PlanId | null {
  const mapa = mapaPrecosStripe();
  const itens = (objeto.items as { data?: { price?: { id?: string } }[] } | undefined)?.data ?? [];
  for (const item of itens) {
    const id = item.price?.id?.toLowerCase();
    if (id && mapa[id]) return mapa[id];
  }
  return null;
}

/**
 * Qual plano foi comprado, em ordem de confiabilidade.
 *
 * O evento de checkout NÃO traz o preço sem que se peça a expansão dos itens à
 * API do Stripe. Em vez de fazer uma chamada de rede no caminho onde o dinheiro
 * está em jogo, resolvemos por identificadores que já vêm no evento:
 *
 *   1. `metadata.plano` — se você escrever "starter" ou "pro" na metadata do
 *      link de pagamento, é o caminho mais direto e não depende de mapa.
 *   2. o id do link de pagamento (`plink_...`), procurado no mesmo mapa dos
 *      preços. É o que funciona sem configurar metadata nenhuma.
 *
 * Por isso STRIPE_PRECOS aceita tanto `price_...` quanto `plink_...`.
 */
function planoDaCompra(objeto: Record<string, unknown>): PlanId | null {
  const mapa = mapaPrecosStripe();

  const daMetadata = (objeto.metadata as { plano?: string } | undefined)?.plano
    ?.toLowerCase()
    .trim();
  if (daMetadata && ["free", "starter", "pro", "cortesia"].includes(daMetadata)) {
    return daMetadata as PlanId;
  }

  const link = objeto.payment_link;
  if (typeof link === "string" && mapa[link.toLowerCase()]) return mapa[link.toLowerCase()];

  return null;
}

/**
 * Situações da assinatura que significam "não pode mais usar".
 *
 * `past_due` entra: a cobrança falhou e o Stripe está tentando de novo. Manter
 * o acesso aberto durante as tentativas é o caminho mais curto para inadimplência
 * silenciosa — e se ele conseguir cobrar, o evento seguinte devolve o plano.
 */
const SITUACOES_SEM_ACESSO = ["canceled", "unpaid", "past_due", "incomplete_expired", "paused"];

export async function POST(req: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!segredo) {
    return NextResponse.json({ erro: "Webhook não configurado." }, { status: 503 });
  }

  const corpo = await req.text();
  if (!assinaturaValida(corpo, req.headers.get("stripe-signature"), segredo)) {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  const evento = JSON.parse(corpo) as {
    id?: string;
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  const tipo = evento.type ?? "";
  const objeto = evento.data?.object ?? {};

  // Grava cru antes de interpretar: se o processamento falhar, o evento
  // continua aqui para ser reprocessado. Em pagamento, aviso perdido é cliente
  // que pagou e ficou sem acesso.
  const registro = await registrarEvento({
    gateway: "stripe",
    evento: tipo,
    email: emailDoEvento(objeto),
    externalId: evento.id ?? null,
    plano: null,
    payload: corpo,
  });

  try {
    // --- Compra concluída ---------------------------------------------------
    if (tipo === "checkout.session.completed") {
      const email = emailDoEvento(objeto);
      const plano = planoDaCompra(objeto);

      if (!email) {
        await marcarProcessado(registro, "Evento sem e-mail do comprador.");
        return NextResponse.json({ recebido: true });
      }

      // Sem saber o plano, não liberamos nada: o evento fica marcado e aparece
      // em /admin/cobranca com o payload inteiro à mão. Um caso para resolver a
      // mão é muito melhor que liberar o plano errado para quem pagou.
      if (!plano) {
        await marcarProcessado(
          registro,
          "Compra recebida, mas não foi possível identificar o plano. Confira STRIPE_PRECOS.",
        );
        return NextResponse.json({ recebido: true });
      }

      const r = await concederPlano(email, plano, {
        gateway: "stripe",
        gatewayId: idDoCliente(objeto),
      });
      await marcarProcessado(registro, r.aplicado ? undefined : r.motivo);
      return NextResponse.json({ recebido: true });
    }

    // --- Assinatura mudou de situação ---------------------------------------
    if (tipo === "customer.subscription.updated" || tipo === "customer.subscription.deleted") {
      const cliente = idDoCliente(objeto);
      const email = emailDoEvento(objeto) ?? (cliente ? await emailPorIdDaPlataforma("stripe", cliente) : null);

      if (!email) {
        await marcarProcessado(registro, "Não foi possível ligar o evento a um e-mail conhecido.");
        return NextResponse.json({ recebido: true });
      }

      const situacao = String(objeto.status ?? "");
      const encerrada = tipo === "customer.subscription.deleted" || SITUACOES_SEM_ACESSO.includes(situacao);

      if (encerrada) {
        const r = await revogarPlano(email, "stripe");
        await marcarProcessado(registro, r.aplicado ? undefined : r.motivo);
        return NextResponse.json({ recebido: true });
      }

      // Voltou a ficar ativa (pagamento recuperado, ou troca de plano).
      const plano = planoDaAssinatura(objeto);
      if (situacao === "active" && plano) {
        const r = await concederPlano(email, plano, { gateway: "stripe", gatewayId: cliente });
        await marcarProcessado(registro, r.aplicado ? undefined : r.motivo);
        return NextResponse.json({ recebido: true });
      }

      await marcarProcessado(registro);
      return NextResponse.json({ recebido: true });
    }

    // Qualquer outro evento fica gravado, mas não mexe em plano nenhum.
    await marcarProcessado(registro);
    return NextResponse.json({ recebido: true });
  } catch (e) {
    await marcarProcessado(registro, String(e));
    // 200 mesmo com erro: o evento já está guardado, e devolver erro faria o
    // Stripe reenviar em loop por dias. O que falhou aparece em /admin/cobranca.
    return NextResponse.json({ recebido: true, observacao: "registrado com erro" });
  }
}

/** GET só para conferir, no navegador, se o endereço está no ar. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    webhook: "stripe",
    configurado: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    precosMapeados: Object.keys(mapaPrecosStripe()).length,
  });
}
