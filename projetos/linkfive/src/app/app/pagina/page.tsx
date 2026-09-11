import { requireUser } from "@/lib/auth";
import { linksDaPagina, paginaDoUsuario } from "@/lib/repo";
import { plano } from "@/lib/limites";
import { Editor } from "@/components/editor/Editor";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MinhaPagina() {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  if (!page) redirect("/onboarding");

  const links = await linksDaPagina(user.id, page.id);
  const p = plano(user.plan);

  return (
    <Editor
      page={page}
      links={links}
      maxLinks={p.maxLinks}
      podeTema={p.temas}
      podePdf={p.catalogoPdf}
      nomePlano={p.nome}
    />
  );
}
