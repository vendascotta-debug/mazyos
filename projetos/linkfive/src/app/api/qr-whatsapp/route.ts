import QRCode from "qrcode";
import { linkWhatsapp, normalizarTelefone, telefoneValido } from "@/lib/links";

/**
 * QR do experimente-antes-de-criar-conta, no topo da landing.
 *
 * Rota pública — precisa ser, porque quem usa ainda não tem conta. Para não
 * virar um gerador de QR gratuito para o mundo inteiro, ela NÃO aceita uma URL
 * qualquer: recebe número e mensagem e monta o wa.me aqui dentro. O visitante
 * não consegue apontar esse QR para lugar nenhum além do WhatsApp.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const numero = params.get("numero") ?? "";
  const mensagem = (params.get("mensagem") ?? "").slice(0, 300);

  if (!telefoneValido(numero)) {
    return new Response("Número inválido.", { status: 400 });
  }

  const alvo = linkWhatsapp(normalizarTelefone(numero), mensagem || undefined);

  const svg = await QRCode.toString(alvo, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "svg",
    // `width` faz a biblioteca escrever width/height no <svg>. Sem isso o
    // arquivo sai só com viewBox, e dentro de uma tag <img> ele colapsa para
    // altura zero — o QR fica invisível sem nenhum erro no console.
    width: 320,
    color: { dark: "#0a1428", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      // O mesmo número gera sempre o mesmo QR: vale cachear na borda e poupar
      // o servidor de redesenhar a cada tecla digitada.
      "cache-control": "public, max-age=3600",
    },
  });
}
