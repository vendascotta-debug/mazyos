import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { paginaDoUsuario } from "@/lib/repo";
import { FormEndereco } from "@/components/app/FormEndereco";

export const dynamic = "force-dynamic";

export default async function Config() {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  if (!page) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-[640px] space-y-5 px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Configurações</h1>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Conta</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Nome</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">E-mail</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Conta criada em</dt>
            <dd className="font-medium">{new Date(user.createdAt).toLocaleDateString("pt-BR")}</dd>
          </div>
        </dl>
      </section>

      <FormEndereco pageId={page.id} slugAtual={page.slug} />
    </div>
  );
}
