import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { linksPublicos, paginaPublica } from "@/lib/repo";
import { plano } from "@/lib/limites";
import { q1 } from "@/lib/db";
import { varsCss } from "@/lib/temas";
import { Rastreador } from "@/components/publica/Rastreador";
import { BotaoLink } from "@/components/publica/BotaoLink";
import type { PlanId } from "@/lib/types";
import { iniciais as calcularIniciais } from "@/lib/iniciais";

// ---------------------------------------------------------------------------
// A página pública é a peça mais importante do produto: é o que o cliente do
// nosso cliente abre no 4G. Duas decisões seguram isso:
//
// 1. NADA de cookie aqui. Ler sessão tornaria a rota dinâmica e cada visita
//    pagaria uma ida ao banco. Por isso o dono NÃO vê o rascunho por este
//    caminho — ele confere pelo preview do editor, em /app/pagina.
// 2. Zero JavaScript de UI. O único script é o Rastreador, que não desenha
//    nada e só dispara os eventos.
// ---------------------------------------------------------------------------

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await paginaPublica(slug);
  if (!page || !page.published) return { title: "Página não encontrada" };

  const titulo = page.seoTitle || page.title || slug;
  const descricao =
    page.seoDescription || page.bio || `Todos os canais de ${titulo} em um só lugar.`;

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      images: page.avatarUrl ? [page.avatarUrl] : undefined,
      type: "profile",
    },
  };
}

export default async function PaginaPublica({ params }: Props) {
  const { slug } = await params;
  const page = await paginaPublica(slug);
  // Rascunho e página inexistente respondem igual: quem não publicou não está
  // no ar, e ninguém descobre que o endereço já foi tomado.
  if (!page || !page.published) notFound();

  const links = await linksPublicos(page.id);

  // O plano do dono decide se a assinatura do LINKFIVE aparece no rodapé.
  const dono = await q1<{ plan: string }>("SELECT plan FROM users WHERE id = ?", [page.userId]);
  const mostrarMarca = plano(dono?.plan as PlanId).marca;

  const iniciais = calcularIniciais(page.title || slug);

  return (
    <>
      {/* As variáveis do tema entram uma vez, aqui. Os componentes abaixo só
          consomem — nenhum deles sabe qual tema está ativo. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            `.lf-root{${varsCss(page.themeId, page.themeOverrides)};` +
            `background:var(--lf-fundo);color:var(--lf-texto);min-height:100vh}`,
        }}
      />

      <div className="lf-root">
        <Rastreador slug={slug} />

        <main className="mx-auto w-full max-w-[560px] px-5 pb-16 pt-12">
          <header className="flex flex-col items-center text-center">
            {page.avatarUrl ? (
              // <img> em vez de next/image: a URL vem colada pelo usuário, de
              // qualquer domínio, e o otimizador exigiria allowlist de domínio.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.avatarUrl}
                alt={page.title || slug}
                className="h-24 w-24 rounded-full object-cover"
                style={{ border: "3px solid var(--lf-cardBorda)" }}
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold"
                style={{ background: "var(--lf-destaque)", color: "var(--lf-destaqueTexto)" }}
              >
                {iniciais || "?"}
              </div>
            )}

            <h1 className="mt-4 text-[22px] font-bold tracking-tight">{page.title || slug}</h1>

            {page.bio && (
              <p
                className="mt-2 max-w-[420px] text-[15px]"
                style={{ color: "var(--lf-textoSuave)" }}
              >
                {page.bio}
              </p>
            )}
          </header>

          <div className="mt-8 flex flex-col gap-3">
            {links.length === 0 ? (
              <p className="text-center text-sm" style={{ color: "var(--lf-textoSuave)" }}>
                Esta página ainda não tem links.
              </p>
            ) : (
              links.map((l) => <BotaoLink key={l.id} link={l} />)
            )}
          </div>

          {mostrarMarca && (
            <footer className="mt-12 text-center">
              <Link
                href="/"
                className="text-xs font-medium opacity-60 transition-opacity hover:opacity-100"
                style={{ color: "var(--lf-textoSuave)" }}
              >
                Feito com LINKFIVE
              </Link>
            </footer>
          )}
        </main>
      </div>
    </>
  );
}
