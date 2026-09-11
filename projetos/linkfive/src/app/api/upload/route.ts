import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { plano } from "@/lib/limites";
import type { PlanId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Envio de arquivo: a logo da página, e o PDF do catálogo.
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

/**
 * O PDF do catálogo, que o visitante abre direto pelo botão.
 *
 * Dez megabytes cobrem um catálogo de 20 a 40 páginas. O teto existe menos por
 * armazenamento e mais por quem abre: no 4G, um PDF grande demais faz o
 * cliente do nosso cliente desistir antes de carregar — e a banda a gente paga
 * do mesmo jeito.
 */
const LIMITE_PDF = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Nenhum arquivo recebido." }, { status: 400 });
  }

  const ehPdf = arquivo.type === "application/pdf";

  if (!ehPdf && !TIPOS.includes(arquivo.type)) {
    return NextResponse.json(
      { erro: "Formato não aceito. Use PNG, JPG, WEBP, GIF ou PDF." },
      { status: 400 },
    );
  }

  // O PDF é recurso pago: o Grátis continua podendo apontar pra um catálogo
  // hospedado fora, mas não hospeda aqui.
  if (ehPdf && !plano(user.plan as PlanId).catalogoPdf) {
    return NextResponse.json(
      {
        erro: "Enviar o PDF do catálogo está disponível a partir do plano Starter.",
        upgrade: "starter",
      },
      { status: 402 },
    );
  }

  const teto = ehPdf ? LIMITE_PDF : LIMITE;
  if (arquivo.size > teto) {
    const mb = (arquivo.size / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      ehPdf
        ? {
            erro:
              `O catálogo tem ${mb} MB e o limite é 10 MB. Comprima o PDF num site ` +
              `gratuito (procure por "comprimir PDF") e envie de novo — ou guarde o ` +
              `arquivo no Google Drive e cole o endereço dele aqui embaixo.`,
          }
        : { erro: `A imagem tem ${mb} MB. O limite é 2 MB — tente uma menor.` },
      { status: 400 },
    );
  }

  const extensao = ehPdf ? "pdf" : arquivo.type.split("/")[1].replace("jpeg", "jpg");
  const pasta = ehPdf ? "catalogos" : "avatares";

  try {
    const enviado = await put(`${pasta}/${user.id}.${extensao}`, arquivo, {
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
      { erro: `Não foi possível enviar ${ehPdf ? "o catálogo" : "a imagem"}. Tente de novo.` },
      { status: 500 },
    );
  }
}
