import type { MetadataRoute } from "next";

/**
 * O que o Google pode e não pode varrer.
 *
 * A regra que mais importa é o bloqueio de `/w/`. Aqueles endereços são
 * redirecionamentos, não páginas: se o robô entrar neles, ele conta como
 * clique — e o número que o cliente vê no painel, e usa para decidir onde
 * anunciar, passa a incluir visitas que nunca foram de gente.
 *
 * O redirecionador já ignora robô conhecido pelo user-agent na hora de contar,
 * mas isso é a segunda linha de defesa. A primeira é não convidar.
 *
 * As telas de conta (`/app`, `/admin`, painel) ficam de fora porque exigem
 * login: indexá-las só encheria o Google de páginas que devolvem a tela de
 * entrar.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://linkfive.com.br";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/app/",
        "/admin/",
        "/onboarding",
        "/entrar",
        "/cadastrar",
        "/recuperar",
        "/redefinir",
        // Os links curtos e as telas de senha e aviso que vivem debaixo deles.
        "/w/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
