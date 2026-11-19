import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { q } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { AcoesPedido } from "@/components/AcoesPedido";

export const dynamic = "force-dynamic";

const TIPO: Record<string, string> = {
  remocao: "Remoção",
  acesso: "Acesso",
  correcao: "Correção",
  outro: "Outro",
};

type Pedido = {
  id: string; kind: string; name: string; email: string; cnpj: string | null;
  message: string | null; status: string; criado: string; prazo: string; vencido: boolean;
};

export default async function AdminPrivacidadePage() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();

  const pedidos = await q<Pedido>(
    `SELECT id, kind, name, email, cnpj, message, status,
            to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS criado,
            to_char(created_at + interval '15 days', 'DD/MM/YYYY') AS prazo,
            (status = 'recebido' AND created_at + interval '15 days' < now()) AS vencido
     FROM privacy_requests ORDER BY (status = 'recebido') DESC, created_at DESC LIMIT 300`,
  );
  const abertos = pedidos.filter((p) => p.status === "recebido").length;

  return (
    <div>
      <PageHeader
        title="Pedidos LGPD"
        subtitle={`${abertos} aguardando você · prazo legal de 15 dias para responder`}
      />
      <div className="space-y-3 p-4 sm:p-6">
        <p className="max-w-3xl text-sm text-ink-600">
          Antes de aprovar uma remoção, confira que quem pediu é a pessoa: responda ao e-mail informado pedindo
          confirmação (por exemplo, um e-mail do domínio da empresa ou uma cópia do contrato social). Aprovada, o nome
          some na hora da busca, ficha, leads e exportação. Dá para desfazer.
        </p>
        {pedidos.length === 0 && <p className="text-sm text-ink-500">Nenhum pedido ainda.</p>}
        {pedidos.map((p) => (
          <div key={p.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-medium text-ink-900">
                {TIPO[p.kind] ?? p.kind} · {p.name}
                {p.cnpj && <span className="ml-2 text-ink-500">CNPJ {p.cnpj}</span>}
              </p>
              <p className="text-ink-600">
                <a className="underline" href={`mailto:${p.email}`}>{p.email}</a> · recebido {p.criado} · prazo {p.prazo}
                {p.vencido && <span className="ml-2 font-medium text-red-600">vencido</span>}
              </p>
              {p.message && <p className="whitespace-pre-wrap text-ink-700">{p.message}</p>}
              <p className="text-xs text-ink-400">
                {p.id} · status: <b>{p.status}</b>
                {!p.cnpj && p.kind === "remocao" && " · sem CNPJ: aprovar esconde o nome em toda a base (homônimos também)"}
              </p>
            </div>
            <AcoesPedido id={p.id} tipo={p.kind} status={p.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
