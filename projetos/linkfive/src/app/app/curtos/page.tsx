import { requireUser } from "@/lib/auth";
import { plano } from "@/lib/limites";
import { curtosDoUsuario } from "@/lib/repo";
import { ListaCurtos } from "@/components/curtos/ListaCurtos";

export const dynamic = "force-dynamic";

export default async function Curtos() {
  const user = await requireUser();
  const curtos = await curtosDoUsuario(user.id);
  const p = plano(user.plan);

  return (
    <ListaCurtos
      curtos={curtos}
      maxCurtos={p.maxCurtos}
      nomePlano={p.nome}
      site={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      podeGerir={p.gestaoLinks}
    />
  );
}
