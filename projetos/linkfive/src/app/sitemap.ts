import type { MetadataRoute } from "next";
import { paginasIndexaveis } from "@/lib/repo";

/**
 * O mapa do site para o Google.
 *
 * Ele se monta sozinho a partir do banco: quando um cliente publica a página,
 * ela entra aqui na próxima leitura, sem ninguém precisar lembrar. Quando o
 * admin suspende uma página, ela sai.
 *
 * As páginas dos clientes são o conteúdo de verdade deste site. A landing
 * fala de nós; elas falam de oficina, restaurante e loja, com endereço e
 * cidade — é por elas que o Google entende que aqui existe algo além de uma
 * página de vendas.
 *
 * Nada de `/w/`, `/app` ou `/admin`: ver `robots.ts` para o porquê.
 */

/** Uma hora. O sitemap não precisa ser instantâneo, e sem isto cada visita de
 *  robô viraria uma consulta ao banco. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://linkfive.com.br";

  const fixas: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/termos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Banco fora do ar não pode derrubar o sitemap: melhor entregar só as fixas
  // do que devolver erro e o Google marcar o arquivo como quebrado.
  let paginas: MetadataRoute.Sitemap = [];
  try {
    paginas = (await paginasIndexaveis()).map((p) => ({
      url: `${base}/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Segue com as fixas.
  }

  return [...fixas, ...paginas];
}
