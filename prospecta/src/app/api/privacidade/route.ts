import { NextResponse } from "next/server";
import { z } from "zod";
import { ipDe, minutosBloqueado, registrarTentativa } from "@/lib/limite";
import { registrarPedido } from "@/lib/privacidade";

export const dynamic = "force-dynamic";

const Schema = z.object({
  tipo: z.enum(["remocao", "acesso", "correcao", "outro"]),
  nome: z.string().trim().min(3, "Informe seu nome completo.").max(150),
  email: z.string().trim().email("E-mail inválido.").max(200),
  cnpj: z.string().trim().max(30).nullish(),
  mensagem: z.string().trim().max(2000).nullish(),
});

/** Pedido de titular (LGPD art. 18). Público: o titular não tem conta. */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const ip = ipDe(req);
  try {
    const espera = await minutosBloqueado("privacidade", ip);
    if (espera > 0) {
      return NextResponse.json({ error: `Muitos pedidos desta rede. Tente de novo em ${espera} min.` }, { status: 429 });
    }
    await registrarTentativa("privacidade", ip, parsed.data.email, true);
    const r = await registrarPedido({
      tipo: parsed.data.tipo,
      nome: parsed.data.nome,
      email: parsed.data.email,
      cnpj: parsed.data.cnpj ?? null,
      mensagem: parsed.data.mensagem ?? null,
      ip,
    });
    return NextResponse.json({ ok: true, protocolo: r.id, suprimido: r.suprimido });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
