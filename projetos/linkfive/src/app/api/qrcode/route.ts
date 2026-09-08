import QRCode from "qrcode";
import { currentUser } from "@/lib/auth";
import { curtoDoDono, curtoPorCodigo, paginaDoUsuario } from "@/lib/repo";

/**
 * QR Code, gerado aqui mesmo.
 *
 * Nada de serviço externo: além de custo e de mais uma dependência fora do ar,
 * entregaria a URL de cada cliente pra um terceiro.
 *
 * Sem parâmetro, aponta para a página do usuário. Com `curto=<id>`, aponta
 * para o link curto direto — é o QR que vai no cartão e na etiqueta.
 *
 * `code=<codigo>` é o único caminho público, e serve ao gerador da landing:
 * quem ainda não tem conta precisa ver o QR do link que acabou de criar. Ele
 * não vira um gerador de QR aberto para o mundo porque só desenha endereços
 * `/w/` que já existem aqui dentro — não há como apontá-lo para fora.
 *
 * `formato=svg` (padrão) serve pra tela e pra impressão em qualquer tamanho.
 * `formato=png` existe porque gráfica e Instagram engolem PNG melhor.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  let alvo: string;
  let nomeArquivo: string;
  let publico = false;

  const codigo = params.get("code");
  const curtoId = params.get("curto");

  if (codigo) {
    // Só confirma que o código existe; nada do link é lido nem devolvido.
    const existe = await curtoPorCodigo(codigo);
    if (existe.estado === "inexistente") {
      return new Response("Link não encontrado.", { status: 404 });
    }
    alvo = `${base}/w/${codigo}`;
    nomeArquivo = `linkfive-w-${codigo}`;
    publico = true;
  } else if (curtoId) {
    const user = await currentUser();
    if (!user) return new Response("Não autenticado.", { status: 401 });
    const curto = await curtoDoDono(user.id, curtoId);
    if (!curto) return new Response("Link não encontrado.", { status: 404 });
    alvo = `${base}/w/${curto.code}`;
    nomeArquivo = `linkfive-w-${curto.code}`;
  } else {
    const user = await currentUser();
    if (!user) return new Response("Não autenticado.", { status: 401 });

    const page = await paginaDoUsuario(user.id);
    if (!page) return new Response("Página não encontrada.", { status: 404 });
    alvo = `${base}/${page.slug}`;
    nomeArquivo = `linkfive-${page.slug}`;
  }

  const formato = params.get("formato") === "png" ? "png" : "svg";
  const tamanho = Math.min(Math.max(Number(params.get("tamanho") ?? 512), 128), 2048);

  const opcoes = {
    // Nível M aguenta o QR sujo, amassado ou parcialmente coberto — que é o
    // estado normal de um adesivo em vitrine depois de um mês.
    errorCorrectionLevel: "M" as const,
    margin: 2,
    width: tamanho,
    color: { dark: "#0a1428", light: "#ffffff" },
  };

  if (formato === "png") {
    const buffer = await QRCode.toBuffer(alvo, { ...opcoes, type: "png" });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `attachment; filename="${nomeArquivo}.png"`,
        "cache-control": publico ? "public, max-age=3600" : "private, max-age=300",
      },
    });
  }

  const svg = await QRCode.toString(alvo, { ...opcoes, type: "svg" });
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": publico ? "public, max-age=3600" : "private, max-age=300",
    },
  });
}
