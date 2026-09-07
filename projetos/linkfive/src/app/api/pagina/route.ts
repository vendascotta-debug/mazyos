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

  const page = await atualizarPagina(user.id, pageId, { ...campos, themeId });
  return NextResponse.json({ page });
}
