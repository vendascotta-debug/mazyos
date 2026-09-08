import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, hashPassword } from "@/lib/auth";
import { podeGerirLinks } from "@/lib/limites";
import { atualizarCurto, curtoDoDono, excluirCurto } from "@/lib/repo";
import { normalizarUrl } from "@/lib/curtos";
import { linkWhatsapp, normalizarTelefone, telefoneValido } from "@/lib/links";

const Corpo = z.object({
  title: z.string().trim().max(60).optional(),
  numero: z.string().trim().optional(),
  mensagem: z.string().trim().max(300).nullish(),
  url: z.string().trim().optional(),
  active: z.boolean().optional(),
  /** Data ISO (AAAA-MM-DD) ou null para nunca expirar. */
  expiraEm: z.string().trim().nullish(),
  /** Senha em texto, só na viagem. `null` remove a proteção. */
  senha: z.string().nullish(),
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

  const campos: Parameters<typeof atualizarCurto>[2] = {
    title: parsed.data.title,
    active: parsed.data.active,
  };

  // Expiração, senha e troca de destino são recurso de plano pago. Ativar e
  // pausar continua livre — tirar do ar o que já está no ar não pode depender
  // de assinatura.
  const mexeNaGestao =
    parsed.data.expiraEm !== undefined ||
    parsed.data.senha !== undefined ||
    parsed.data.numero !== undefined ||
    parsed.data.url !== undefined ||
    parsed.data.mensagem !== undefined;

  if (mexeNaGestao) {
    const v = podeGerirLinks(user.plan);
    if (!v.permitido) {
      return NextResponse.json({ erro: v.motivo, upgrade: v.upgrade }, { status: 402 });
    }
  }

  // --- Destino ---
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
      const mensagem = parsed.data.mensagem === undefined ? atual.mensagem : parsed.data.mensagem;
      campos.numero = normalizarTelefone(numero);
      campos.mensagem = mensagem ?? null;
      campos.destino = linkWhatsapp(numero, mensagem ?? undefined);
    }
  } else if (parsed.data.url !== undefined) {
    const v = normalizarUrl(parsed.data.url);
    if (!v.ok) return NextResponse.json({ erro: v.erro, campo: "url" }, { status: 400 });
    campos.destino = v.url;
  }

  // --- Expiração ---
  if (parsed.data.expiraEm !== undefined) {
    if (!parsed.data.expiraEm) {
      campos.expiraEm = null;
    } else {
      // O campo do formulário manda AAAA-MM-DD. Guardamos o FIM do dia
      // escolhido: quem digita 31/12 espera que o link funcione o dia 31
      // inteiro, não que morra à meia-noite do dia 30 para o 31.
      const d = new Date(`${parsed.data.expiraEm}T23:59:59-03:00`);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ erro: "Data inválida.", campo: "expiraEm" }, { status: 400 });
      }
      if (d.getTime() < Date.now()) {
        return NextResponse.json(
          { erro: "Essa data já passou. Escolha uma data futura.", campo: "expiraEm" },
          { status: 400 },
        );
      }
      campos.expiraEm = d.toISOString();
    }
  }

  // --- Senha ---
  if (parsed.data.senha !== undefined) {
    if (!parsed.data.senha) {
      campos.senhaHash = null;
    } else {
      if (parsed.data.senha.length < 4) {
        return NextResponse.json(
          { erro: "A senha do link precisa ter ao menos 4 caracteres.", campo: "senha" },
          { status: 400 },
        );
      }
      // Mesmo scrypt das contas. A senha em texto morre aqui.
      campos.senhaHash = hashPassword(parsed.data.senha);
    }
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
