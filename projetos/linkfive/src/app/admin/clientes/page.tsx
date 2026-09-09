import Link from "next/link";
import { clientes, type FiltroCliente } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { TabelaClientes } from "@/components/admin/TabelaClientes";

export const dynamic = "force-dynamic";

export default async function AdminClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; filtro?: string }>;
}) {
  const admin = await requireAdmin();
  const { busca, filtro } = await searchParams;

  const RECORTES: Record<string, string> = {
    pagantes: "Pagantes",
    cortesia: "Cortesias",
    publicadas: "Com página publicada",
    "com-leads": "Que já capturaram leads",
    pausadas: "Contas pausadas",
  };
  const recorte = filtro && RECORTES[filtro] ? (filtro as FiltroCliente) : undefined;
  const lista = await clientes(busca ?? "", 200, recorte);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Clientes</h1>
      <p className="mt-1 text-sm text-ink-500">
        Quem se cadastrou, o que cada um está usando e quanto movimento a página dele tem.
      </p>

      {recorte && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[13px] font-medium text-brand-700">
            {RECORTES[recorte]}
            <span className="text-brand-500">· {lista.length}</span>
          </span>
          <Link href="/admin/clientes" className="text-[13px] text-ink-500 hover:underline">
            Ver todos
          </Link>
        </div>
      )}

      <TabelaClientes
        clientes={lista}
        busca={busca ?? ""}
        meuId={admin.id}
        site={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      />
    </div>
  );
}
