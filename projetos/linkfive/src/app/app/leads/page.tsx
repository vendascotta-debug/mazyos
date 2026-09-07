import Link from "next/link";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { plano } from "@/lib/limites";
import { leadsDaPagina, paginaDoUsuario } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function Leads() {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  const p = plano(user.plan);
  const leads = page && p.formularios ? await leadsDaPagina(user.id, page.id) : [];

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Leads</h1>
      <p className="mt-1 text-sm text-ink-500">Quem preencheu o formulário da sua página.</p>

      {!p.formularios ? (
        <div className="card mt-5 flex flex-col items-center px-5 py-10 text-center">
          <Users size={26} className="text-ink-300" />
          <p className="mt-3 max-w-[420px] text-sm text-ink-600">
            A captura de leads entra a partir do plano Pro. O formulário aparece na sua página e os
            contatos caem aqui.
          </p>
          <Link href="/app/planos" className="btn-brand mt-4">
            Ver planos
          </Link>
        </div>
      ) : leads.length === 0 ? (
        <div className="card mt-5 px-5 py-10 text-center text-sm text-ink-500">
          Nenhum lead ainda. Adicione o bloco de formulário na sua página.
        </div>
      ) : (
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-ink-200 text-left text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">{l.name ?? "—"}</td>
                  <td className="px-4 py-3">{l.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3">{l.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {new Date(l.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
