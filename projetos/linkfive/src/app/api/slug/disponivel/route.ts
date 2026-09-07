import { NextResponse } from "next/server";
import { slugDisponivel } from "@/lib/repo";
import { normalizarSlug, sugerirSlugs, validarSlug } from "@/lib/slug";

/**
 * Checagem de disponibilidade enquanto o usuário digita.
 *
 * Devolve sempre 200 — "indisponível" não é erro de requisição, é resposta.
 * A tela usa `erro` pra mostrar o motivo e `sugestoes` quando o nome já foi
 * levado por outra pessoa.
 */
export async function GET(req: Request) {
  const bruto = new URL(req.url).searchParams.get("slug") ?? "";
  const slug = normalizarSlug(bruto);

  const v = validarSlug(slug);
  if (!v.ok) return NextResponse.json({ slug, disponivel: false, erro: v.erro });

  const livre = await slugDisponivel(slug);
  return NextResponse.json({
    slug,
    disponivel: livre,
    erro: livre ? null : "Esse endereço já está em uso.",
    sugestoes: livre ? [] : await filtrarLivres(sugerirSlugs(slug)),
  });
}

/** Só sugere o que realmente está livre — sugerir nome ocupado irrita. */
async function filtrarLivres(candidatos: string[]): Promise<string[]> {
  const saida: string[] = [];
  for (const c of candidatos) {
    if (validarSlug(c).ok && (await slugDisponivel(c))) saida.push(c);
  }
  return saida;
}
