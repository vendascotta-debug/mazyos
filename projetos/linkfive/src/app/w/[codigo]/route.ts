import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { abrirCurtoComSenha, curtoPorCodigo, registrarCliqueCurto } from "@/lib/repo";

// ---------------------------------------------------------------------------
// O redirecionador: linkfive.com.br/w/abc123 → destino.
//
// É uma Route Handler, e não uma página, de propósito: no caminho normal não
// há nada pra desenhar. O visitante sai do anúncio e chega no WhatsApp, e
// qualquer HTML no meio seria tempo perdido no 4G.
//
// Também é o caminho mais crítico do produto: se ele falhar, o cliente do
// nosso cliente não conversa com ninguém. Por isso o registro do clique nunca
// pode derrubar o redirecionamento — ver o catch mais abaixo.
// ---------------------------------------------------------------------------

function dispositivo(ua: string): string {
  if (/bot|crawl|spider|preview|facebookexternalhit|whatsapp/i.test(ua)) return "bot";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

/** Registra o clique sem nunca atrapalhar a navegação. */
async function contar(req: Request, shortId: string) {
  const ua = req.headers.get("user-agent") ?? "";
  const device = dispositivo(ua);

  // O WhatsApp e o Facebook buscam o link para montar a pré-visualização da
  // mensagem. Isso não é uma pessoa querendo falar com a empresa, e contar
  // inflaria o número que o dono usa pra decidir onde anunciar.
  if (device === "bot") return;

  try {
    await registrarCliqueCurto(shortId, device, req.headers.get("referer"));
  } catch {
    // Banco fora do ar não pode impedir a conversa de acontecer. Perde-se a
    // estatística, não o cliente.
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const curto = await curtoPorCodigo(codigo);

  if (curto.estado === "expirado") {
    return NextResponse.redirect(new URL(`/w/${codigo}/aviso?motivo=expirado`, req.url), 307);
  }

  if (curto.estado === "pedeSenha") {
    return NextResponse.redirect(new URL(`/w/${codigo}/senha`, req.url), 307);
  }

  if (curto.estado === "inexistente") {
    // Sem link, o visitante vai pra home em vez de encarar um 404 seco. Ele
    // veio de um cartão ou de um QR impresso e não tem culpa nenhuma.
    return NextResponse.redirect(new URL("/?link=indisponivel", req.url), 307);
  }

  await contar(req, curto.id);

  // 307 e não 301: o 301 fica no cache do navegador para sempre, e trocar o
  // destino depois deixaria o visitante preso no antigo.
  return NextResponse.redirect(curto.destino, 307);
}

/**
 * Recebe a senha do formulário e redireciona se ela conferir.
 *
 * A validação e o redirecionamento acontecem na MESMA requisição, de
 * propósito: uma API que devolvesse o destino em JSON entregaria o link
 * protegido a quem soubesse chamar a rota. Aqui, quem erra a senha só recebe
 * de volta a mesma tela.
 */
export async function POST(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const form = await req.formData().catch(() => null);
  const senha = String(form?.get("senha") ?? "");

  const aberto = await abrirCurtoComSenha(codigo, senha, verifyPassword);

  if (!aberto) {
    return NextResponse.redirect(new URL(`/w/${codigo}/senha?erro=1`, req.url), 303);
  }

  await contar(req, aberto.id);
  // 303 porque a requisição foi um POST: sem ele, o navegador tentaria repetir
  // o envio ao voltar para a página.
  return NextResponse.redirect(aberto.destino, 303);
}
