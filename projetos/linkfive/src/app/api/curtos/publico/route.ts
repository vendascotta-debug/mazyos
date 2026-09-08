import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { podeCriarCurto } from "@/lib/limites";
import {
  adotarCurtos,
  codigoDisponivel,
  contarCurtos,
  contarCurtosNoMes,
  contarOrfaosDoVisitante,
  criarCurtoOrfao,
  curtoDoDono,
} from "@/lib/repo";
import { gerarCodigo, normalizarUrl, validarCodigoPersonalizado } from "@/lib/curtos";
import { linkWhatsapp, normalizarTelefone, telefoneValido } from "@/lib/links";
import { TETO_POR_HORA, lembrarCurtoDoConvidado, marcaDoVisitante } from "@/lib/convidado";

// ---------------------------------------------------------------------------
// Encurtar sem conta.
//
// É a rota do gerador da landing. O visitante encurta de verdade — endereço
// nosso, QR nosso, contador nosso — e só depois decide se cria conta. É o que o
// concorrente faz, e é o que faltava aqui: até então a landing só montava um
// `wa.me` no navegador, que é um link que nós não hospedamos e sobre o qual não
// sabemos nada.
//
// O que a torna segura de deixar aberta:
//   · teto por visitante e por hora (ver TETO_POR_HORA)
//   · o link nasce com 30 dias de prazo e morre sozinho se ninguém adotar
//   · o destino passa por `normalizarUrl`, que só aceita http e https
// ---------------------------------------------------------------------------

/** Prazo do link não reivindicado. */
const DIAS_ORFAO = 30;

const Corpo = z.object({
  tipo: z.enum(["whatsapp", "url"]).default("url"),
  numero: z.string().trim().optional(),
  mensagem: z.string().trim().max(300).optional(),
  url: z.string().trim().max(2000).optional(),
  code: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }
  const { tipo, mensagem } = parsed.data;

  const marca = marcaDoVisitante(req);
  const umaHoraAtras = new Date(Date.now() - 3600 * 1000).toISOString();
  if ((await contarOrfaosDoVisitante(marca, umaHoraAtras)) >= TETO_POR_HORA) {
    return NextResponse.json(
      {
        erro: `Você já criou ${TETO_POR_HORA} links nesta hora. Crie uma conta grátis para continuar sem limite de teste.`,
      },
      { status: 429 },
    );
  }

  // Cada tipo monta o próprio destino, igual à rota autenticada: o destino é
  // guardado pronto para o redirecionador não remontar nada a cada clique.
  let destino: string;
  let numero: string | null = null;
  let titulo: string;

  if (tipo === "whatsapp") {
    const bruto = parsed.data.numero ?? "";
    if (!telefoneValido(bruto)) {
      return NextResponse.json(
        { erro: "Número inválido. Informe com DDD — ex.: 11 99999-9999.", campo: "numero" },
        { status: 400 },
      );
    }
    numero = normalizarTelefone(bruto);
    destino = linkWhatsapp(bruto, mensagem);
    titulo = "Link do WhatsApp";
  } else {
    const v = normalizarUrl(parsed.data.url ?? "");
    if (!v.ok) return NextResponse.json({ erro: v.erro, campo: "url" }, { status: 400 });
    destino = v.url;
    titulo = "Link encurtado";
  }

  let code: string;
  if (parsed.data.code) {
    const v = validarCodigoPersonalizado(parsed.data.code);
    if (!v.ok) return NextResponse.json({ erro: v.erro, campo: "code" }, { status: 400 });
    if (!(await codigoDisponivel(parsed.data.code))) {
      return NextResponse.json({ erro: "Esse código já está em uso.", campo: "code" }, { status: 409 });
    }
    code = parsed.data.code;
  } else {
    code = gerarCodigo();
    for (let i = 0; i < 5 && !(await codigoDisponivel(code)); i++) code = gerarCodigo();
    if (!(await codigoDisponivel(code))) {
      return NextResponse.json({ erro: "Não foi possível gerar o código. Tente de novo." }, { status: 500 });
    }
  }

  const curto = await criarCurtoOrfao({
    code,
    tipo,
    title: titulo,
    numero,
    mensagem: tipo === "whatsapp" ? mensagem || null : null,
    destino,
    ipHash: marca,
    expiraEm: new Date(Date.now() + DIAS_ORFAO * 24 * 3600 * 1000).toISOString(),
  });
  if (!curto) {
    return NextResponse.json({ erro: "Não foi possível criar o link. Tente de novo." }, { status: 500 });
  }

  // Quem já está logado não deveria sair da landing com um link temporário na
  // mão: ele vira link da conta na hora, desde que o plano ainda comporte.
  const user = await currentUser();
  let salvo = false;
  let atual = curto;
  if (user) {
    const veredito = podeCriarCurto(
      user.plan,
      await contarCurtos(user.id),
      await contarCurtosNoMes(user.id),
    );
    if (veredito.permitido && (await adotarCurtos(user.id, [curto.id])) === 1) {
      salvo = true;
      // Relê depois de adotar: a adoção apaga o prazo de 30 dias, e devolver o
      // objeto de antes faria a tela anunciar uma validade que não existe mais.
      atual = (await curtoDoDono(user.id, curto.id)) ?? curto;
    }
  }

  // O id só existe no cookie, assinado e httpOnly. A tela nunca precisa dele —
  // e um id na resposta seria um convite a tentar reivindicar o link alheio.
  if (!salvo) await lembrarCurtoDoConvidado(curto.id);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  return NextResponse.json({
    curto: {
      code: atual.code,
      tipo: atual.tipo,
      title: atual.title,
      destino: atual.destino,
      expiraEm: atual.expiraEm,
    },
    url: `${base}/w/${atual.code}`,
    /** true = já entrou na conta de quem está logado; false = ainda é órfão. */
    salvo,
    diasParaExpirar: DIAS_ORFAO,
  });
}
