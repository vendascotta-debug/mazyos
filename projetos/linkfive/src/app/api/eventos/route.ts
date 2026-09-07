import { NextResponse } from "next/server";
import { z } from "zod";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { registrarClique, registrarView, paginaPublica } from "@/lib/repo";
import { q1 } from "@/lib/db";

// ---------------------------------------------------------------------------
// Registro de visualização e clique.
//
// Público de propósito: quem visita a página não tem sessão. Por isso a rota
// não aceita nada além de ids — nunca contadores, nunca "some 10". O evento é
// sempre +1, e o servidor é quem decide a data.
// ---------------------------------------------------------------------------

const Corpo = z.object({
  tipo: z.enum(["view", "click"]),
  slug: z.string().min(1),
  linkId: z.string().min(1).optional(),
});

/** Classifica o dispositivo pelo user-agent. Grosso de propósito: só precisamos
 *  saber se o tráfego é de celular, e um parser completo não paga o custo. */
function dispositivo(ua: string): string {
  if (/bot|crawl|spider|preview|facebookexternalhit|whatsapp/i.test(ua)) return "bot";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export async function POST(req: Request) {
  const parsed = Corpo.safeParse(await req.json().catch(() => null));
  // Falha em silêncio: o registro nunca pode atrapalhar a navegação de quem
  // está clicando pra falar com a empresa.
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 204 });

  const ua = req.headers.get("user-agent") ?? "";
  const device = dispositivo(ua);
  // Bot não infla estatística. O dono do negócio precisa confiar no número.
  if (device === "bot") return NextResponse.json({ ok: true, ignorado: "bot" });

  const page = await paginaPublica(parsed.data.slug);
  if (!page) return NextResponse.json({ ok: false }, { status: 404 });

  // O próprio dono visitando a página também não conta.
  const jar = await cookies();
  const userId = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (userId && userId === page.userId) {
    return NextResponse.json({ ok: true, ignorado: "dono" });
  }

  const referrer = req.headers.get("referer");

  if (parsed.data.tipo === "view") {
    await registrarView(page.id, device, referrer);
    return NextResponse.json({ ok: true });
  }

  const linkId = parsed.data.linkId;
  if (!linkId) return NextResponse.json({ ok: false }, { status: 400 });

  // Confere que o link é mesmo dessa página — senão um id qualquer inflaria o
  // contador de outra conta.
  const link = await q1<{ type: string }>(
    "SELECT type FROM links WHERE id = ? AND page_id = ?",
    [linkId, page.id],
  );
  if (!link) return NextResponse.json({ ok: false }, { status: 404 });

  await registrarClique(linkId, page.id, link.type, device, referrer);
  return NextResponse.json({ ok: true });
}
