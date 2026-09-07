import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  concederPlano,
  mapaProdutos,
  marcarProcessado,
  registrarEvento,
  revogarPlano,
} from "@/lib/cobranca";
import type { PlanId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Webhook do Lastlink.
//
// ESCRITO SEM CONHECER O FORMATO EXATO. O Lastlink é quem define os nomes dos
// campos, e eles podem não bater com o que está aqui. Por isso:
//
//   1. Todo evento é gravado CRU antes de qualquer interpretação. Nenhuma
//      venda se perde por causa de um campo com nome diferente.
//   2. A extração procura os campos em vários lugares plausíveis, em vez de
//      exigir um caminho único.
//   3. O que não for entendido fica marcado como não processado, visível em
//      /admin/cobranca, com o payload inteiro à mão para ajustar o mapeamento.
//
// Quando a primeira venda real chegar, é só olhar o payload gravado e acertar
// as listas de nomes abaixo.
// ---------------------------------------------------------------------------

/** Nomes de evento que significam "liberar acesso". */
const EVENTOS_LIBERA = [
  "purchase_order_confirmed",
  "purchase.approved",
  "purchase_approved",
  "subscription.created",
  "subscription_created",
  "subscription.renewed",
  "recurrent_payment",
  "payment_approved",
  "approved",
  "paid",
];

/**
 * Nomes de evento que significam "encerrar acesso".
 *
 * Esta lista é conferida ANTES da de liberação, e isso não é detalhe: a
 * comparação é por "contém", e um evento `unpaid` contém `paid`. Se a ordem
 * fosse a inversa, uma cobrança recusada liberaria plano pago.
 */
const EVENTOS_REVOGA = [
  "purchase_request_expired",
  "purchase.refunded",
  "purchase_refunded",
  "subscription.canceled",
  "subscription.cancelled",
  "subscription_canceled",
  "subscription.expired",
  "chargeback",
  "refunded",
  "canceled",
  "cancelled",
  "expired",
  "unpaid",
  "payment_failed",
  "payment_refused",
  "past_due",
  "declined",
];

/** Procura uma chave em qualquer profundidade do objeto. */
function buscar(obj: unknown, chaves: string[], profundidade = 0): string | null {
  if (!obj || typeof obj !== "object" || profundidade > 6) return null;

  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const nome = k.toLowerCase();
    if (chaves.includes(nome) && (typeof v === "string" || typeof v === "number")) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  // Não achou no nível atual: desce. O Lastlink aninha o comprador dentro de
  // `data`, `Buyer`, `customer`… e cada plataforma escolhe um.
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (v && typeof v === "object") {
      const achou = buscar(v, chaves, profundidade + 1);
      if (achou) return achou;
    }
  }
  return null;
}

/**
 * Acha o identificador do produto comprado.
 *
 * Plataforma de venda quase sempre manda o item dentro de uma lista — o
 * checkout aceita mais de um produto no mesmo pedido. Procurar só uma chave
 * `productId` solta no topo não encontraria nada, e a venda cairia como
 * "produto não mapeado".
 */
function extrairProduto(payload: unknown): string | null {
  // 1. Chave direta, em qualquer profundidade.
  const direto = buscar(payload, [
    "productid",
    "product_id",
    "offerid",
    "offer_id",
    "planid",
    "plan_id",
    "produto",
  ]);
  if (direto) return direto;

  // 2. Primeiro item de uma lista de produtos.
  const listas = ["products", "produtos", "offers", "items", "itens", "lineitems"];
  function varrer(obj: unknown, nivel = 0): string | null {
    if (!obj || typeof obj !== "object" || nivel > 6) return null;

    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (listas.includes(k.toLowerCase()) && Array.isArray(v) && v.length > 0) {
        const primeiro = v[0];
        if (typeof primeiro === "string") return primeiro;
        const id = buscar(primeiro, ["id", "productid", "product_id", "offerid", "code", "sku"]);
        if (id) return id;
      }
    }
    for (const v of Object.values(obj as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        const achou = varrer(v, nivel + 1);
        if (achou) return achou;
      }
    }
    return null;
  }
  return varrer(payload);
}

function primeiroEmail(payload: unknown): string | null {
  const direto = buscar(payload, ["email", "buyeremail", "customeremail", "e-mail", "mail"]);
  if (direto && direto.includes("@")) return direto;

  // Último recurso: varre o JSON inteiro procurando algo com cara de e-mail.
  const texto = JSON.stringify(payload);
  const m = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : null;
}

/** Compara o token de forma resistente a medição de tempo. */
function tokenConfere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const segredo = process.env.LASTLINK_WEBHOOK_SECRET?.trim();

  // Sem segredo configurado a rota fica fechada. Aberta, qualquer um poderia
  // liberar plano pago mandando um POST.
  if (!segredo) {
    return NextResponse.json({ erro: "Webhook não configurado." }, { status: 503 });
  }

  const url = new URL(req.url);
  const recebido =
    req.headers.get("x-lastlink-token") ??
    req.headers.get("x-webhook-token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("token") ??
    "";

  if (!tokenConfere(recebido, segredo)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });

  const evento = buscar(payload, ["event", "evento", "type", "eventtype", "status", "action"]);
  const email = primeiroEmail(payload);
  const externalId = buscar(payload, ["id", "orderid", "transactionid", "subscriptionid"]);
  const produtoId = extrairProduto(payload);

  // Primeiro grava, depois interpreta. Nunca o contrário.
  const eventoId = await registrarEvento({
    gateway: "lastlink",
    evento,
    email,
    externalId,
    plano: produtoId,
    payload,
  });

  try {
    if (!email) {
      await marcarProcessado(eventoId, "Não encontrei o e-mail do comprador no payload.");
      // 200 de propósito: o Lastlink não deve reenviar. O evento está salvo e
      // aparece no painel para tratamento manual.
      return NextResponse.json({ ok: true, aviso: "sem e-mail" });
    }

    const ev = (evento ?? "").toLowerCase();
    const libera = EVENTOS_LIBERA.some((x) => ev.includes(x.toLowerCase()));
    const revoga = EVENTOS_REVOGA.some((x) => ev.includes(x.toLowerCase()));

    if (revoga) {
      const r = await revogarPlano(email, "lastlink");
      await marcarProcessado(eventoId, r.aplicado ? undefined : r.motivo);
      return NextResponse.json({ ok: true, acao: "revogado", ...r });
    }

    if (libera) {
      const mapa = mapaProdutos();
      const plano = (produtoId && mapa[produtoId.toLowerCase()]) as PlanId | undefined;

      if (!plano) {
        await marcarProcessado(
          eventoId,
          `Produto "${produtoId ?? "sem id"}" não está no LASTLINK_PRODUTOS. Configure o mapeamento e reprocesse.`,
        );
        return NextResponse.json({ ok: true, aviso: "produto não mapeado" });
      }

      const r = await concederPlano(email, plano, {
        gateway: "lastlink",
        gatewayId: externalId,
      });
      await marcarProcessado(eventoId, r.aplicado ? undefined : r.motivo);
      return NextResponse.json({ ok: true, acao: "concedido", plano, ...r });
    }

    await marcarProcessado(eventoId, `Evento "${evento ?? "sem nome"}" não reconhecido.`);
    return NextResponse.json({ ok: true, aviso: "evento ignorado" });
  } catch (e) {
    await marcarProcessado(eventoId, e instanceof Error ? e.message : String(e));
    // 500 aqui é proposital: falha nossa, o Lastlink deve tentar de novo.
    return NextResponse.json({ erro: "Falha ao processar." }, { status: 500 });
  }
}

/** GET só para conferir, no navegador, se o endereço está no ar. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    webhook: "lastlink",
    configurado: Boolean(process.env.LASTLINK_WEBHOOK_SECRET),
    produtosMapeados: Object.keys(mapaProdutos()).length,
  });
}
