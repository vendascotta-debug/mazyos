import QRCode from "qrcode";
import { currentUser } from "@/lib/auth";
import { paginaDoUsuario } from "@/lib/repo";

/**
 * QR Code da página do usuário, gerado aqui mesmo.
 *
 * Nada de serviço externo de QR: além de custo e de mais uma dependência fora
 * do ar, entregaria a URL de cada cliente pra um terceiro.
 *
 * `formato=svg` (padrão) serve pra tela e pra impressão em qualquer tamanho.
 * `formato=png` existe porque gráfica e Instagram engolem PNG melhor.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Não autenticado.", { status: 401 });

  const page = await paginaDoUsuario(user.id);
  if (!page) return new Response("Página não encontrada.", { status: 404 });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const alvo = `${base}/${page.slug}`;

  const params = new URL(req.url).searchParams;
  const formato = params.get("formato") === "png" ? "png" : "svg";
  const tamanho = Math.min(Math.max(Number(params.get("tamanho") ?? 512), 128), 2048);

  const opcoes = {
    errorCorrectionLevel: "M" as const,
    margin: 2,
    width: tamanho,
    color: { dark: "#12121a", light: "#ffffff" },
  };

  if (formato === "png") {
    const buffer = await QRCode.toBuffer(alvo, { ...opcoes, type: "png" });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `attachment; filename="linkfive-${page.slug}.png"`,
        "cache-control": "private, max-age=300",
      },
    });
  }

  const svg = await QRCode.toString(alvo, { ...opcoes, type: "svg" });
  return new Response(svg, {
    headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=300" },
  });
}
