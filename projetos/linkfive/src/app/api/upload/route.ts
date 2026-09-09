import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Envio de imagem (logo ou foto da página).
//
// Existe porque colar endereço de imagem não funciona para quem tem a logo só
// no celular — que é a maioria dos donos de oficina, loja e restaurante. O
// primeiro dono de página real que tentou usar o campo antigo colou o endereço
// do SITE em vez do da imagem, e a página saiu quebrada sem avisar nada.
//
// O arquivo vai para o Vercel Blob, público: a imagem aparece numa página que
// qualquer visitante abre, então não há o que esconder. O que importa proteger
// é QUEM envia — daí a exigência de sessão.
// ---------------------------------------------------------------------------

/**
 * Só formatos que o navegador desenha, e que a gente sabe que são imagem.
 *
 * SVG fica de fora de propósito: ele é um documento XML que aceita script
 * dentro, e servido do nosso domínio viraria execução de código na página de
 * quem visita. Logo em SVG é raro; buraco de segurança aberto por ele, não.
 */
const TIPOS = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Dois megabytes. Logo não precisa de mais, e foto de celular passa fácil. */
const LIMITE = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Nenhum arquivo recebido." }, { status: 400 });
  }

  if (!TIPOS.includes(arquivo.type)) {
    return NextResponse.json(
      { erro: "Formato não aceito. Use PNG, JPG, WEBP ou GIF." },
      { status: 400 },
    );
  }

  if (arquivo.size > LIMITE) {
    const mb = (arquivo.size / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      { erro: `A imagem tem ${mb} MB. O limite é 2 MB — tente uma menor.` },
      { status: 400 },
    );
  }

  const extensao = arquivo.type.split("/")[1].replace("jpeg", "jpg");

  try {
    const enviado = await put(`avatares/${user.id}.${extensao}`, arquivo, {
      access: "public",
      contentType: arquivo.type,
      // O endereço ganha um sufixo aleatório. Sem isso, trocar a logo manteria
      // o mesmo endereço, e o navegador de quem já visitou continuaria
      // mostrando a antiga por causa do cache.
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: enviado.url });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json(
      { erro: "Não foi possível enviar a imagem. Tente de novo." },
      { status: 500 },
    );
  }
}
