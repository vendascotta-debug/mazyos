import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { atualizarCurto, curtoDoDono, excluirCurto } from "@/lib/repo";
import { linkWhatsapp, normalizarTelefone, telefoneValido } from "@/lib/links";

const Corpo = z.object({
  title: z.string().trim().max(60).optional(),
  numero: z.string().trim().optional(),
  mensagem: z.string().trim().max(300).nullish(),
  active: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const atual = await curtoDoDono(user.id, id);
  if (!atual) return NextResponse.json({ erro: "Link não encontrado." }, { status: 404 });

  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.numero !== undefined && !telefoneValido(parsed.data.numero)) {
    return NextResponse.json(
      { erro: "Número inválido. Informe com DDD.", campo: "numero" },
      { status: 400 },
    );
  }

  // Mudou número ou mensagem? O destino precisa ser remontado, senão o link
  // continua levando pro número antigo — o pior tipo de bug nesse produto,
  // porque o QR já impresso continua funcionando e mandando pro lugar errado.
  const numero = parsed.data.numero ?? atual.numero;
  const mensagem =
    parsed.data.mensagem === undefined ? atual.mensagem : parsed.data.mensagem;
  const mexeuNoDestino = parsed.data.numero !== undefined || parsed.data.mensagem !== undefined;

  const curto = await atualizarCurto(user.id, id, {
    title: parsed.data.title,
    active: parsed.data.active,
    ...(mexeuNoDestino
      ? {
          numero: normalizarTelefone(numero),
          mensagem: mensagem ?? null,
          destino: linkWhatsapp(numero, mensagem ?? undefined),
        }
      : {}),
  });

  return NextResponse.json({ curto });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const ok = await excluirCurto(user.id, id);
  if (!ok) return NextResponse.json({ erro: "Link não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
