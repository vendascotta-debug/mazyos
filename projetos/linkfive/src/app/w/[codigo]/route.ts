import { NextResponse } from "next/server";
import { curtoPorCodigo, registrarCliqueCurto } from "@/lib/repo";

// ---------------------------------------------------------------------------
// O redirecionador: linkfive.com.br/w/abc123 → conversa no WhatsApp.
//
// É uma Route Handler, e não uma página, de propósito: não há nada pra
// desenhar. O visitante nunca vê tela nenhuma — sai do anúncio e chega no
// WhatsApp. Qualquer HTML no meio seria tempo perdido no 4G.
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

export async function GET(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const curto = await curtoPorCodigo(codigo);

  if (!curto) {
    // Sem link, o visitante vai pra home em vez de encarar um 404 seco. Ele
    // veio de um cartão ou de um QR impresso e não tem culpa nenhuma.
    return NextResponse.redirect(new URL("/?link=indisponivel", req.url), 307);
  }

  const ua = req.headers.get("user-agent") ?? "";
  const device = dispositivo(ua);

  // O WhatsApp e o Facebook buscam o link para montar a pré-visualização da
  // mensagem. Isso não é uma pessoa querendo falar com a empresa, e contar
  // inflaria o número que o dono usa pra decidir onde anunciar.
  if (device !== "bot") {
    try {
      await registrarCliqueCurto(curto.id, device, req.headers.get("referer"));
    } catch {
      // Banco fora do ar não pode impedir a conversa de acontecer. Perde-se a
      // estatística, não o cliente.
    }
  }

  // 307 e não 301: o 301 fica no cache do navegador para sempre, e trocar o
  // número do WhatsApp depois deixaria o visitante preso no destino antigo.
  return NextResponse.redirect(curto.destino, 307);
}
