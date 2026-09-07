import { clientes } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { TabelaClientes } from "@/components/admin/TabelaClientes";

export const dynamic = "force-dynamic";

export default async function AdminClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const admin = await requireAdmin();
  const { busca } = await searchParams;
  const lista = await clientes(busca ?? "");

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Clientes</h1>
      <p className="mt-1 text-sm text-ink-500">
        Quem se cadastrou, o que cada um está usando e quanto movimento a página dele tem.
      </p>

      <TabelaClientes
        clientes={lista}
        busca={busca ?? ""}
        meuId={admin.id}
        site={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      />
    </div>
  );
}
