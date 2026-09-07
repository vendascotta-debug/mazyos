import { AlertTriangle, Check } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { cobrancaConfigurada, eventosRecentes, mapaProdutos } from "@/lib/cobranca";

export const dynamic = "force-dynamic";

/**
 * O que os gateways mandaram.
 *
 * Existe para o momento em que uma venda não liberar acesso: em vez de
 * adivinhar, você abre aqui e vê exatamente o que chegou. Enquanto o formato
 * do Lastlink não estiver confirmado, é também de onde saem os nomes de campo
 * corretos para ajustar o webhook.
 */
export default async function AdminCobranca() {
  await requireAdmin();
  const eventos = await eventosRecentes(50);
  const produtos = mapaProdutos();
  const configurado = cobrancaConfigurada();
  const temSegredo = Boolean(process.env.LASTLINK_WEBHOOK_SECRET);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-5 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Cobrança</h1>
        <p className="mt-1 text-sm text-ink-500">
          Tudo que o gateway avisou, como chegou. Nada é descartado.
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Configuração</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            {temSegredo ? (
              <Check size={15} className="text-ok-500" />
            ) : (
              <AlertTriangle size={15} className="text-warn-500" />
            )}
            <span>
              <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">
                LASTLINK_WEBHOOK_SECRET
              </code>{" "}
              {temSegredo ? "configurado" : "faltando — o webhook responde 503 até ser definido"}
            </span>
          </li>
          <li className="flex items-center gap-2">
            {configurado ? (
              <Check size={15} className="text-ok-500" />
            ) : (
              <AlertTriangle size={15} className="text-warn-500" />
            )}
            <span>
              <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">
                LASTLINK_CHECKOUT_*
              </code>{" "}
              {configurado
                ? "configurado — os botões de assinar estão ativos"
                : 'faltando — os botões mostram "Em breve"'}
            </span>
          </li>
          <li className="flex items-center gap-2">
            {Object.keys(produtos).length > 0 ? (
              <Check size={15} className="text-ok-500" />
            ) : (
              <AlertTriangle size={15} className="text-warn-500" />
            )}
            <span>
              <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">LASTLINK_PRODUTOS</code>:{" "}
              {Object.keys(produtos).length > 0
                ? Object.entries(produtos)
                    .map(([id, plano]) => `${id} → ${plano}`)
                    .join(", ")
                : "nenhum produto mapeado — o webhook não sabe qual plano liberar"}
            </span>
          </li>
        </ul>

        <p className="mt-4 rounded-[10px] bg-ink-50 px-3.5 py-3 text-xs text-ink-600">
          Endereço para cadastrar no Lastlink:{" "}
          <code className="font-medium text-brand-600">
            {(process.env.NEXT_PUBLIC_SITE_URL ?? "") + "/api/webhooks/lastlink"}
          </code>
          <br />O token vai no cabeçalho <code>x-lastlink-token</code> ou como{" "}
          <code>?token=</code> na própria URL, se a plataforma não permitir cabeçalho.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Últimos eventos</h2>

        {eventos.length === 0 ? (
          <p className="text-sm text-ink-400">
            Nenhum evento recebido ainda. Depois da primeira venda, o conteúdo bruto aparece aqui —
            é dele que sai o mapeamento definitivo dos campos.
          </p>
        ) : (
          <ul className="space-y-3">
            {eventos.map((e) => (
              <li
                key={e.id}
                className={`rounded-[10px] border p-3.5 ${
                  e.processado ? "border-ink-200" : "border-warn-500/40 bg-accent-100"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      e.processado ? "bg-ok-500/10 text-ok-500" : "bg-warn-500/15 text-warn-500"
                    }`}
                  >
                    {e.processado ? "processado" : "pendente"}
                  </span>
                  <span className="font-medium">{e.evento ?? "sem nome de evento"}</span>
                  {e.email && <span className="text-ink-500">{e.email}</span>}
                  <span className="ml-auto text-xs text-ink-400">
                    {new Date(e.criadoEm).toLocaleString("pt-BR")}
                  </span>
                </div>

                {e.erro && <p className="mt-2 text-sm text-warn-500">{e.erro}</p>}

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-ink-500">
                    Ver o que chegou
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-[8px] bg-ink-900 p-3 text-[11px] leading-relaxed text-ink-100">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(e.payload), null, 2);
                      } catch {
                        return e.payload;
                      }
                    })()}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
