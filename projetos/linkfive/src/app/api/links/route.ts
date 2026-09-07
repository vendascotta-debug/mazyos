import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { podeCriarLink } from "@/lib/limites";
import { contarLinks, criarLink, linksDaPagina, paginaDoDono } from "@/lib/repo";
import { montarUrl } from "@/lib/links";

const TIPOS = [
  "link", "whatsapp", "instagram", "facebook", "tiktok", "youtube", "maps",
  "phone", "email", "catalog", "product", "service", "form",
] as const;

const Corpo = z.object({
  pageId: z.string().min(1),
  type: z.enum(TIPOS),
  title: z.string().trim().min(1, "Dê um título ao botão."),
  url: z.string().trim().optional(),
  icon: z.string().trim().nullish(),
  config: z.record(z.unknown()).optional(),
});

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const pageId = new URL(req.url).searchParams.get("pageId");
  if (!pageId) return NextResponse.json({ erro: "pageId ausente." }, { status: 400 });

  return NextResponse.json({ links: await linksDaPagina(user.id, pageId) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }
  const { pageId, type, title, icon } = parsed.data;

  // 404 em vez de 403: para quem tenta adivinhar id de outra conta, a página
  // simplesmente não existe.
  if (!(await paginaDoDono(user.id, pageId))) {
    return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
  }

  // A cota é checada no servidor. Esconder o botão no front é conforto, não
  // controle de acesso.
  const veredito = podeCriarLink(user.plan, await contarLinks(user.id, pageId));
  if (!veredito.permitido) {
    return NextResponse.json(
      { erro: veredito.motivo, upgrade: veredito.upgrade },
      { status: 402 },
    );
  }

  const config = parsed.data.config ?? {};
  const url = montarUrl(type, parsed.data.url ?? "", config);

  const link = await criarLink(user.id, pageId, { type, title, url, icon: icon ?? null, config });
  return NextResponse.json({ link });
}
