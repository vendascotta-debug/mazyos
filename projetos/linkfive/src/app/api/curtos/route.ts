import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { podeCriarCurto } from "@/lib/limites";
import { codigoDisponivel, contarCurtos, criarCurto, curtosDoUsuario } from "@/lib/repo";
import { gerarCodigo, validarCodigoPersonalizado } from "@/lib/curtos";
import { linkWhatsapp, normalizarTelefone, telefoneValido } from "@/lib/links";

const Corpo = z.object({
  title: z.string().trim().max(60).optional(),
  numero: z.string().trim().min(1, "Informe o número do WhatsApp."),
  mensagem: z.string().trim().max(300).optional(),
  /** Opcional: o usuário pode escolher o código em vez de aceitar o sorteado. */
  code: z.string().trim().optional(),
});

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ curtos: await curtosDoUsuario(user.id) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }
  const { numero, mensagem } = parsed.data;

  if (!telefoneValido(numero)) {
    return NextResponse.json(
      { erro: "Número inválido. Informe com DDD — ex.: 11 97393-3648.", campo: "numero" },
      { status: 400 },
    );
  }

  const veredito = podeCriarCurto(user.plan, await contarCurtos(user.id));
  if (!veredito.permitido) {
    return NextResponse.json({ erro: veredito.motivo, upgrade: veredito.upgrade }, { status: 402 });
  }

  // Código: o escolhido pelo usuário, ou um sorteado que ainda esteja livre.
  let code: string;
  if (parsed.data.code) {
    const v = validarCodigoPersonalizado(parsed.data.code);
    if (!v.ok) return NextResponse.json({ erro: v.erro, campo: "code" }, { status: 400 });
    if (!(await codigoDisponivel(parsed.data.code))) {
      return NextResponse.json(
        { erro: "Esse código já está em uso.", campo: "code" },
        { status: 409 },
      );
    }
    code = parsed.data.code;
  } else {
    // Seis caracteres num alfabeto de 56 dão ~30 bilhões de combinações; a
    // colisão é rara, mas tentar de novo é barato e evita o erro chegar na tela.
    code = gerarCodigo();
    for (let i = 0; i < 5 && !(await codigoDisponivel(code)); i++) code = gerarCodigo();
    if (!(await codigoDisponivel(code))) {
      return NextResponse.json({ erro: "Não foi possível gerar o código. Tente de novo." }, { status: 500 });
    }
  }

  const curto = await criarCurto(user.id, {
    code,
    title: parsed.data.title?.trim() || "Link do WhatsApp",
    numero: normalizarTelefone(numero),
    mensagem: mensagem || null,
    // O destino é montado no servidor e guardado pronto: o redirecionador só
    // lê e devolve, sem remontar URL a cada clique.
    destino: linkWhatsapp(numero, mensagem),
  });

  return NextResponse.json({ curto });
}
