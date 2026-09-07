import { NextResponse } from "next/server";
import { z } from "zod";
import { q1 } from "@/lib/db";
import { plano } from "@/lib/limites";
import { paginaPublica, registrarLead } from "@/lib/repo";
import type { PlanId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Recebe o formulário da página pública.
//
// Rota pública: quem preenche é um visitante sem conta. Por isso ela aceita o
// mínimo possível — slug, id do bloco e os campos do formulário. Nada de
// pageId ou userId vindo do cliente, que seria a porta para gravar lead na
// caixa de outra pessoa.
// ---------------------------------------------------------------------------

const Corpo = z.object({
  slug: z.string().min(1),
  linkId: z.string().min(1),
  name: z.string().trim().max(120).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().max(160).optional(),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: "Preencha os campos e tente de novo." }, { status: 400 });
  }
  const { slug, linkId, ...campos } = parsed.data;

  // Bot enche formulário. Não é uma defesa forte, mas custa nada e corta o
  // ruído mais óbvio do contador de leads do cliente.
  const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|curl|python-requests/i.test(ua)) {
    return NextResponse.json({ ok: true, ignorado: "bot" });
  }

  // Sem nenhum contato o lead não serve pra nada: o dono não teria como
  // responder.
  if (!campos.whatsapp && !campos.email) {
    return NextResponse.json(
      { erro: "Informe ao menos um WhatsApp ou e-mail para contato." },
      { status: 400 },
    );
  }

  const page = await paginaPublica(slug);
  if (!page || !page.published) {
    return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
  }

  // O bloco precisa ser mesmo desta página e do tipo formulário — senão um id
  // qualquer gravaria lead em outra conta.
  const link = await q1<{ type: string }>("SELECT type FROM links WHERE id = ? AND page_id = ?", [
    linkId,
    page.id,
  ]);
  if (!link || link.type !== "form") {
    return NextResponse.json({ erro: "Formulário não encontrado." }, { status: 404 });
  }

  // A captura é recurso de plano pago. Checado aqui, no servidor: se o dono
  // caiu de plano, o formulário para de gravar mesmo que a página antiga
  // ainda mostre o bloco.
  const dono = await q1<{ plan: string }>("SELECT plan FROM users WHERE id = ?", [page.userId]);
  if (!plano(dono?.plan as PlanId).formularios) {
    return NextResponse.json(
      { erro: "Este formulário está indisponível no momento." },
      { status: 403 },
    );
  }

  await registrarLead(page.id, {
    linkId,
    name: campos.name ?? null,
    whatsapp: campos.whatsapp ?? null,
    email: campos.email ?? null,
    company: campos.company ?? null,
    message: campos.message ?? null,
    source: req.headers.get("referer"),
  });

  return NextResponse.json({ ok: true });
}
