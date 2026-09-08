import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { podeCriarCurto } from "@/lib/limites";
import {
  codigoDisponivel,
  contarCurtos,
  contarCurtosNoMes,
  criarCurto,
  curtosDoUsuario,
} from "@/lib/repo";
import { gerarCodigo, normalizarUrl, validarCodigoPersonalizado } from "@/lib/curtos";
import { linkWhatsapp, normalizarTelefone, telefoneValido } from "@/lib/links";

const Corpo = z.object({
  /** "whatsapp" monta o wa.me a partir do número; "url" encurta o que veio. */
  tipo: z.enum(["whatsapp", "url"]).default("whatsapp"),
  title: z.string().trim().max(60).optional(),
  numero: z.string().trim().optional(),
  mensagem: z.string().trim().max(300).optional(),
  url: z.string().trim().optional(),
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
  const { tipo, mensagem } = parsed.data;

  // Cada tipo valida o seu campo e monta o próprio destino. O destino é
  // guardado pronto: o redirecionador só lê e devolve, sem remontar nada a
  // cada clique — é o caminho mais quente do produto.
  let destino: string;
  let numero: string | null = null;
  let tituloPadrao: string;

  if (tipo === "whatsapp") {
    const bruto = parsed.data.numero ?? "";
    if (!telefoneValido(bruto)) {
      return NextResponse.json(
        { erro: "Número inválido. Informe com DDD — ex.: 11 97393-3648.", campo: "numero" },
        { status: 400 },
      );
    }
    numero = normalizarTelefone(bruto);
    destino = linkWhatsapp(bruto, mensagem);
    tituloPadrao = "Link do WhatsApp";
  } else {
    const v = normalizarUrl(parsed.data.url ?? "");
    if (!v.ok) return NextResponse.json({ erro: v.erro, campo: "url" }, { status: 400 });
    destino = v.url;
    tituloPadrao = "Link encurtado";
  }

  // Os dois tetos: quantos existem ativos e quantos já foram criados no mês.
  const veredito = podeCriarCurto(
    user.plan,
    await contarCurtos(user.id),
    await contarCurtosNoMes(user.id),
  );
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
      return NextResponse.json(
        { erro: "Não foi possível gerar o código. Tente de novo." },
        { status: 500 },
      );
    }
  }

  const curto = await criarCurto(user.id, {
    code,
    tipo,
    title: parsed.data.title?.trim() || tituloPadrao,
    numero,
    mensagem: tipo === "whatsapp" ? mensagem || null : null,
    destino,
  });

  return NextResponse.json({ curto });
}
