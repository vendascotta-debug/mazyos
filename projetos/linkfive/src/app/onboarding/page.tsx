import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { linksDaPagina, paginaDoUsuario } from "@/lib/repo";
import { plano } from "@/lib/limites";
import { TEMAS } from "@/lib/temas";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const dynamic = "force-dynamic";

export default async function PaginaOnboarding() {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  // Sem página não há o que configurar — só acontece se algo falhou no
  // cadastro, e mandar de volta é melhor que uma tela quebrada.
  if (!page) redirect("/cadastrar");

  const links = await linksDaPagina(user.id, page.id);
  const p = plano(user.plan);

  return (
    <Onboarding
      page={page}
      links={links}
      temas={Object.values(TEMAS)}
      podeTema={p.temas}
      site={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
