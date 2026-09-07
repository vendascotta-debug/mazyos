import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { atualizarCurto, curtoDoDono, excluirCurto } from "@/lib/repo";
import { normalizarUrl } from "@/lib/curtos";
import { linkWhatsapp, normalizarTelefone, telefoneValido } from "@/lib/links";

const Corpo = z.object({
  title: z.string().trim().max(60).optional(),
  numero: z.string().trim().optional(),
  mensagem: z.string().trim().max(300).nullish(),
  url: z.string().trim().optional(),
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

  // Mudou o destino? Ele precisa ser remontado, senão o link continua levando
  // pro lugar antigo — o pior bug possível aqui, porque o QR já impresso segue
  // funcionando e mandando o cliente pro endereço errado.
  const campos: Parameters<typeof atualizarCurto>[2] = {
    title: parsed.data.title,
    active: parsed.data.active,
  };

  if (atual.tipo === "whatsapp") {
    const mexeu = parsed.data.numero !== undefined || parsed.data.mensagem !== undefined;
    if (mexeu) {
      const numero = parsed.data.numero ?? atual.numero ?? "";
      if (!telefoneValido(numero)) {
        return NextResponse.json(
          { erro: "Número inválido. Informe com DDD.", campo: "numero" },
          { status: 400 },
        );
      }
      const mensagem =
        parsed.data.mensagem === undefined ? atual.mensagem : parsed.data.mensagem;
      campos.numero = normalizarTelefone(numero);
      campos.mensagem = mensagem ?? null;
      campos.destino = linkWhatsapp(numero, mensagem ?? undefined);
    }
  } else if (parsed.data.url !== undefined) {
    const v = normalizarUrl(parsed.data.url);
    if (!v.ok) return NextResponse.json({ erro: v.erro, campo: "url" }, { status: 400 });
    campos.destino = v.url;
  }

  const curto = await atualizarCurto(user.id, id, campos);
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
