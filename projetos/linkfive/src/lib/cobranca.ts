import { nowIso, q, q1, uid } from "@/lib/db";
import type { PlanId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Cobrança.
//
// O LINKFIVE não processa pagamento: quem faz isso é a plataforma (hoje o
// Lastlink). O papel deste módulo é traduzir o que a plataforma avisa para
// uma coisa só — qual plano cada e-mail tem direito.
//
// DECISÃO IMPORTANTE: a assinatura é ancorada no E-MAIL, não no usuário.
// No Lastlink a pessoa paga num checkout fora do nosso sistema e pode nunca
// ter criado conta aqui. Se a assinatura dependesse de um `user_id`, o
// pagamento dela cairia no vazio. Ancorando no e-mail, o acesso já está
// esperando quando ela se cadastrar.
//
// Trocar de plataforma depois é escrever um tradutor novo: o resto do sistema
// só conhece "e-mail X tem plano Y".
// ---------------------------------------------------------------------------

export type Gateway = "lastlink" | "mercadopago" | "manual";

/**
 * De qual plano é cada produto da plataforma.
 *
 * Configurado em LASTLINK_PRODUTOS, no formato `idDoProduto:plano`, separados
 * por vírgula. Exemplo:
 *
 *   LASTLINK_PRODUTOS=abc123:starter,def456:pro,ghi789:business
 *
 * Fica em variável de ambiente, e não no código, porque os ids são criados no
 * painel do Lastlink e mudam sem aviso — não vale um deploy cada vez.
 */
export function mapaProdutos(): Record<string, PlanId> {
  const bruto = process.env.LASTLINK_PRODUTOS ?? "";
  const mapa: Record<string, PlanId> = {};
  for (const par of bruto.split(",")) {
    const [id, plano] = par.split(":").map((x) => x.trim());
    if (id && plano) mapa[id.toLowerCase()] = plano as PlanId;
  }
  return mapa;
}

/** Link do checkout de cada plano, para os botões da tela de assinatura. */
export function checkoutDoPlano(plano: PlanId): string | null {
  const chave = `LASTLINK_CHECKOUT_${plano.toUpperCase()}`;
  const url = process.env[chave]?.trim();
  return url || null;
}

export function cobrancaConfigurada(): boolean {
  return Boolean(process.env.LASTLINK_CHECKOUT_PRO || process.env.LASTLINK_CHECKOUT_STARTER);
}

// --- Registro cru ----------------------------------------------------------

/**
 * Grava o evento como chegou, antes de qualquer interpretação.
 *
 * É a primeira coisa que o webhook faz. Se o processamento falhar depois, o
 * evento continua aqui para ser reprocessado — em pagamento, perder um aviso
 * significa um cliente que pagou e ficou sem acesso.
 */
export async function registrarEvento(dados: {
  gateway: Gateway;
  evento: string | null;
  email: string | null;
  externalId: string | null;
  plano: string | null;
  payload: unknown;
}): Promise<string> {
  const id = uid("wh_");
  await q(
    `INSERT INTO webhook_events (id, gateway, evento, email, external_id, plano, payload,
                                 processado, erro, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
    [
      id,
      dados.gateway,
      dados.evento,
      dados.email?.toLowerCase() ?? null,
      dados.externalId,
      dados.plano,
      JSON.stringify(dados.payload).slice(0, 20000),
      nowIso(),
    ],
  );
  return id;
}

export async function marcarProcessado(id: string, erro?: string): Promise<void> {
  await q("UPDATE webhook_events SET processado = ?, erro = ? WHERE id = ?", [
    erro ? 0 : 1,
    erro ?? null,
    id,
  ]);
}

export interface EventoWebhook {
  id: string;
  gateway: string;
  evento: string | null;
  email: string | null;
  externalId: string | null;
  plano: string | null;
  payload: string;
  processado: boolean;
  erro: string | null;
  criadoEm: string;
}

export async function eventosRecentes(limite = 50): Promise<EventoWebhook[]> {
  const rows = await q<{
    id: string;
    gateway: string;
    evento: string | null;
    email: string | null;
    external_id: string | null;
    plano: string | null;
    payload: string;
    processado: number;
    erro: string | null;
    created_at: string;
  }>(`SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT ${Number(limite)}`);

  return rows.map((r) => ({
    id: r.id,
    gateway: r.gateway,
    evento: r.evento,
    email: r.email,
    externalId: r.external_id,
    plano: r.plano,
    payload: r.payload,
    processado: Boolean(r.processado),
    erro: r.erro,
    criadoEm: r.created_at,
  }));
}

// --- Concessão e revogação -------------------------------------------------

/**
 * Concede o plano ao e-mail.
 *
 * Se já existe conta com esse e-mail, o plano entra na hora. Se não existe, a
 * assinatura fica registrada esperando — e `aplicarAssinaturaPendente` a
 * aplica no momento do cadastro.
 */
export async function concederPlano(
  email: string,
  plano: PlanId,
  dados: { gateway: Gateway; gatewayId: string | null; validoAte?: string | null },
): Promise<{ aplicado: boolean; motivo: string }> {
  const e = email.toLowerCase().trim();

  // Uma assinatura ativa por e-mail: a troca de plano encerra a anterior, em
  // vez de empilhar duas ativas e deixar dúvida sobre qual vale.
  await q("UPDATE subscriptions SET status = 'cancelada' WHERE email = ? AND status = 'ativa'", [e]);

  await q(
    `INSERT INTO subscriptions (id, user_id, email, plan_id, status, current_period_end,
                                gateway, gateway_id, created_at)
     VALUES (?, NULL, ?, ?, 'ativa', ?, ?, ?, ?)`,
    [uid("sub_"), e, plano, dados.validoAte ?? null, dados.gateway, dados.gatewayId, nowIso()],
  );

  const user = await q1<{ id: string }>("SELECT id FROM users WHERE email = ?", [e]);
  if (!user) {
    return {
      aplicado: false,
      motivo: "Pagamento registrado, mas ainda não existe conta com esse e-mail.",
    };
  }

  await q("UPDATE users SET plan = ? WHERE id = ?", [plano, user.id]);
  await q("UPDATE subscriptions SET user_id = ? WHERE email = ? AND user_id IS NULL", [user.id, e]);
  return { aplicado: true, motivo: `Plano ${plano} liberado.` };
}

/**
 * Encerra a assinatura e devolve a conta ao Free.
 *
 * Nada é apagado: a página, os links e os leads continuam. O cliente que
 * cancelou e voltar dois meses depois encontra tudo onde deixou — apagar
 * trabalho de quem parou de pagar é a forma mais rápida de não recuperar
 * ninguém.
 */
export async function revogarPlano(
  email: string,
  gateway: Gateway,
): Promise<{ aplicado: boolean; motivo: string }> {
  const e = email.toLowerCase().trim();
  await q(
    "UPDATE subscriptions SET status = 'cancelada' WHERE email = ? AND status = 'ativa' AND gateway = ?",
    [e, gateway],
  );

  const user = await q1<{ id: string; plan: string }>("SELECT id, plan FROM users WHERE email = ?", [
    e,
  ]);
  if (!user) return { aplicado: false, motivo: "Não existe conta com esse e-mail." };

  // Cortesia é concedido por nós, não comprado. Um cancelamento na plataforma
  // não pode derrubar quem ganhou acesso de presente.
  if (user.plan === "cortesia") {
    return { aplicado: false, motivo: "Conta está no Cortesia; o plano foi mantido." };
  }

  await q("UPDATE users SET plan = 'free' WHERE id = ?", [user.id]);
  return { aplicado: true, motivo: "Assinatura encerrada; conta voltou ao Free." };
}

/**
 * Aplica assinatura que chegou antes do cadastro.
 *
 * Chamada no momento em que a conta é criada. Sem isso, quem paga primeiro e
 * se cadastra depois — que é o caminho normal num checkout externo — ficaria
 * no Free depois de ter pago.
 */
export async function aplicarAssinaturaPendente(userId: string, email: string): Promise<PlanId | null> {
  const e = email.toLowerCase().trim();
  const sub = await q1<{ id: string; plan_id: string }>(
    "SELECT id, plan_id FROM subscriptions WHERE email = ? AND status = 'ativa' ORDER BY created_at DESC LIMIT 1",
    [e],
  );
  if (!sub) return null;

  await q("UPDATE users SET plan = ? WHERE id = ?", [sub.plan_id, userId]);
  await q("UPDATE subscriptions SET user_id = ? WHERE id = ?", [userId, sub.id]);
  return sub.plan_id as PlanId;
}
