import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { janelaAnalytics, podeTrocarTema } from "@/lib/limites";
import {
  atualizarPagina,
  paginaDoDono,
  paginaDoUsuario,
  serieDiaria,
  somarTotais,
  trocarSlug,
} from "@/lib/repo";
import { normalizarSlug, validarSlug } from "@/lib/slug";
import { TEMAS } from "@/lib/temas";

const Corpo = z.object({
  pageId: z.string().min(1),
  title: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(200).nullish(),
  avatarUrl: z.string().trim().max(500).nullish(),
  themeId: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  seoTitle: z.string().trim().max(70).nullish(),
  seoDescription: z.string().trim().max(160).nullish(),
});

/**
 * A página do usuário logado, com os totais do período que o plano permite.
 * Serve à tela e é o que o teste ponta a ponta consulta para conferir se os
 * contadores subiram.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const page = await paginaDoUsuario(user.id);
  if (!page) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });

  const dias = janelaAnalytics(user.plan, 30).dias;
  const totais = somarTotais(await serieDiaria(user.id, page.id, dias));

  return NextResponse.json({ pageId: page.id, slug: page.slug, published: page.published, totais });
}

/**
 * O endereço colado é mesmo uma imagem?
 *
 * O campo aceitava qualquer texto, e o primeiro dono de página real colou ali
 * o endereço do próprio site. A página saiu com o círculo quebrado e nada
 * explicava o motivo — nem para ele, nem para quem visitasse.
 *
 * A checagem custa uma requisição no momento de salvar, uma vez. Deixar passar
 * custa uma página quebrada até alguém reparar.
 *
 * Endereço do nosso próprio Blob passa direto: foi enviado por esta aplicação,
 * já validado na entrada, e não vale gastar rede conferindo o que nós mesmos
 * gravamos.
 */
async function pareceImagem(url: string): Promise<boolean> {
  if (/^https:\/\/[a-z0-9.-]*\.public\.blob\.vercel-storage\.com\//i.test(url)) return true;

  try {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), 5000);

    // HEAD primeiro; alguns servidores não respondem HEAD, então cai para um
    // GET pedindo só o primeiro byte.
    let r = await fetch(url, { method: "HEAD", signal: controle.signal }).catch(() => null);
    if (!r || !r.ok) {
      r = await fetch(url, {
        method: "GET",
        headers: { range: "bytes=0-0" },
        signal: controle.signal,
      }).catch(() => null);
    }
    clearTimeout(relogio);

    if (!r || !r.ok) return false;
    return (r.headers.get("content-type") ?? "").toLowerCase().startsWith("image/");
  } catch {
    return false;
  }
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }
  const { pageId, slug, themeId, ...campos } = parsed.data;

  if (!(await paginaDoDono(user.id, pageId))) {
    return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
  }

  // Troca de tema é recurso de plano pago — checado aqui, no servidor.
  if (themeId && themeId !== "clean") {
    const v = podeTrocarTema(user.plan);
    if (!v.permitido) {
      return NextResponse.json({ erro: v.motivo, upgrade: v.upgrade }, { status: 402 });
    }
    if (!TEMAS[themeId]) {
      return NextResponse.json({ erro: "Tema desconhecido." }, { status: 400 });
    }
  }

  if (slug !== undefined) {
    const limpo = normalizarSlug(slug);
    const v = validarSlug(limpo);
    if (!v.ok) return NextResponse.json({ erro: v.erro, campo: "slug" }, { status: 400 });

    const atual = await paginaDoDono(user.id, pageId);
    if (atual && atual.slug !== limpo) {
      const trocou = await trocarSlug(user.id, pageId, limpo);
      if (!trocou) {
        return NextResponse.json(
          { erro: "Esse endereço já está em uso.", campo: "slug" },
          { status: 409 },
        );
      }
    }
  }

  // A logo é conferida antes de gravar: endereço que não devolve imagem sai
  // daqui com recado, em vez de virar círculo quebrado na página do cliente.
  if (campos.avatarUrl) {
    if (!(await pareceImagem(campos.avatarUrl))) {
      return NextResponse.json(
        {
          erro:
            "Esse endereço não devolve uma imagem. Se você copiou o endereço do site, " +
            "clique com o botão direito na logo e escolha \"Copiar endereço da imagem\" — " +
            "ou envie o arquivo pelo botão.",
          campo: "avatarUrl",
        },
        { status: 400 },
      );
    }
  }

  const page = await atualizarPagina(user.id, pageId, { ...campos, themeId });
  return NextResponse.json({ page });
}
