import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { linksDaPagina, paginaDoUsuario } from "@/lib/repo";
import { plano } from "@/lib/limites";
import { TEMAS } from "@/lib/temas";
import { SeletorTema } from "@/components/editor/SeletorTema";

export const dynamic = "force-dynamic";

export default async function Aparencia() {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  if (!page) redirect("/onboarding");

  const links = await linksDaPagina(user.id, page.id);
  const p = plano(user.plan);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Aparência</h1>
      <p className="mt-1 text-sm text-ink-500">
        Escolha o visual da sua página. A troca é imediata no preview.
      </p>

      <SeletorTema
        page={page}
        links={links.filter((l) => l.active)}
        temas={Object.values(TEMAS)}
        podeTrocar={p.temas}
        nomePlano={p.nome}
      />
    </div>
  );
}
