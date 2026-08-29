import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Building2, Clock, ExternalLink, Globe, Instagram, Linkedin, Mail,
  MapPin, Phone, Search, Star, UserRound, MessageCircle,
} from "lucide-react";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { getCompany, getLeadActivities, listLists, siblingUnits } from "@/lib/repo";
import { getSegment } from "@/lib/segments";
import { ROLE_LABEL, approachFor, linkedinPeopleUrl, linkedinPersonUrl, linkedinSearchUrl } from "@/lib/decisores";
import { TIER_LABEL } from "@/lib/scoring";
import { ConfidenceBadge, ScoreBadge, StageBadge, brl } from "@/components/ui";
import { SaveLeadButton } from "@/components/SaveLeadButton";
import { LeadControls } from "@/components/LeadControls";
import { MapPanel } from "@/components/MapPanel";

export const dynamic = "force-dynamic";

const dateBr = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getCompany(id, user.id);
  if (!data) notFound();

  const { company: c, score, decisionMakers, records, lead } = data;
  const segment = getSegment(c.segmentSlug);
  const sub = segment.subsegments.find((s) => s.slug === c.subsegmentSlug);
  const lists = (await listLists(user.id, c.segmentSlug)).map((l) => ({ id: l.id, name: l.name }));
  const irmas = await siblingUnits(c);
  const activities = lead ? await getLeadActivities(user.id, lead.id) : [];

  const nomeados = decisionMakers.filter((d) => d.name);
  const inferidos = decisionMakers.filter((d) => !d.name);

  return (
    <div>
      <header className="border-b border-ink-200 bg-white px-4 py-4 sm:px-7 sm:py-5">
        <Link href={`/buscar?segment=${c.segmentSlug}`} className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-800">
          <ArrowLeft size={13} /> voltar para a busca
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{c.name}</h1>
              <ScoreBadge score={score.total} tier={score.tier} />
              {lead && <StageBadge stage={lead.stage} />}
              {c.situacao && c.situacao !== "ATIVA" && (
                <span className="chip border-red-200 bg-red-50 text-red-700">CNPJ {c.situacao.toLowerCase()}</span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-ink-500">
              {c.legalName} · {c.cnpj}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
              <span className="chip border-ink-200 bg-ink-50 text-ink-600">{sub?.name}</span>
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {c.street}, {c.number} — {c.neighborhood}, {c.city}/{c.uf}
              </span>
              {c.reviewsCount ? (
                <span className="flex items-center gap-1">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {c.rating?.toFixed(1)} · {c.reviewsCount.toLocaleString("pt-BR")} avaliações
                </span>
              ) : null}
            </p>
          </div>

          {!lead && <SaveLeadButton companyId={c.id} savedLeadId={null} lists={lists} />}
        </div>
      </header>

      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* ---------------- Decisores ---------------- */}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-brand-50/50 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                  <UserRound size={17} className="text-brand-600" />
                  Quem decide a compra
                </h2>
                <p className="mt-0.5 text-xs text-ink-500">
                  {nomeados.length
                    ? `${nomeados.length} pessoa(s) identificada(s) em fonte pública · ${inferidos.length} cargo(s) provável(is) pelo porte`
                    : "Nenhum nome em fonte pública — cargos prováveis inferidos pelo porte da operação"}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={linkedinSearchUrl(c)} target="_blank" rel="noreferrer noopener" className="btn-ghost !py-1.5 text-xs">
                  <Search size={13} /> Busca X-Ray
                </a>
                <a href={linkedinPeopleUrl(c)} target="_blank" rel="noreferrer noopener" className="btn-ghost !py-1.5 text-xs">
                  <Linkedin size={13} /> LinkedIn da empresa
                </a>
              </div>
            </div>

            <ul className="divide-y divide-ink-100">
              {decisionMakers.map((d) => (
                <li key={d.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <div
                    className={clsx(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold",
                      d.name ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-400",
                    )}
                  >
                    {d.name ? d.name.split(" ").slice(0, 2).map((n) => n[0]).join("") : "?"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink-900">
                        {d.name ?? <span className="text-ink-600">Cargo provável — nome não localizado</span>}
                      </p>
                      <span className="chip border-ink-200 bg-ink-50 text-ink-600">{ROLE_LABEL[d.roleCategory]}</span>
                      <ConfidenceBadge confidence={d.confidence} />
                      {d.participation != null && (
                        <span className="chip border-ink-200 bg-white text-ink-500">{d.participation}% do capital</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-700">{d.role}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{d.evidence}</p>
                    <p className="mt-1.5 text-xs italic text-ink-500">💡 {approachFor(c, d)}</p>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="chip border-ink-200 bg-white text-ink-500">fonte: {d.source}</span>
                      {d.entryDate && (
                        <span className="chip border-ink-200 bg-white text-ink-500">no quadro desde {dateBr(d.entryDate)}</span>
                      )}
                      {d.linkedin && (
                        <a
                          href={d.linkedin}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="chip border-[#0a66c2]/25 bg-[#0a66c2]/5 text-[#0a66c2] hover:bg-[#0a66c2]/10"
                        >
                          <Linkedin size={11} /> perfil no LinkedIn <ExternalLink size={10} />
                        </a>
                      )}
                      {d.email && (
                        <a href={`mailto:${d.email}`} className="chip border-ink-200 bg-white text-ink-600 hover:bg-ink-50">
                          <Mail size={11} /> {d.email}
                        </a>
                      )}
                      {!d.linkedin && (
                        <a
                          href={d.name ? linkedinPersonUrl(c, d.name) : linkedinSearchUrl(c, [d.role])}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="chip border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                        >
                          <Search size={11} /> procurar {d.name ? "o perfil" : "esse cargo"} no LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="border-t border-ink-200 bg-ink-50 px-5 py-3 text-xs text-ink-500">
              {segment.labels.buyerHint}
            </p>
          </section>

          {/* ---------------- Score ---------------- */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">Lead Score — como chegamos em {score.total}</h2>
              <span className="text-xs text-ink-500">{TIER_LABEL[score.tier]}</span>
            </div>
            <div className="mt-4 space-y-3">
              {score.factors.map((f) => (
                <div key={f.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink-800">{f.label}</span>
                    <span className="tabular-nums text-ink-500">
                      {f.points}/{f.maxPoints}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(f.points / f.maxPoints) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{f.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ---------------- Dados públicos ---------------- */}
          <section className="card p-5">
            <h2 className="mb-4 font-semibold text-ink-900">Dados públicos</h2>
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {[
                ["CNPJ", c.cnpj],
                ["Razão social", c.legalName],
                ["Abertura", dateBr(c.openedAt)],
                ["Situação cadastral", c.situacao],
                ["Porte", `${c.porte ?? "—"} · ${c.employeesRange ?? "—"} funcionários`],
                ["Capital social", brl(c.capitalSocial)],
                ["CNAE principal", c.cnaePrincipal ? `${c.cnaePrincipal} — ${c.cnaePrincipalDesc}` : "—"],
                ["CNAEs secundários", c.cnaeSecundarios.join(", ") || "—"],
                ["Unidades", `${c.unitsCount} unidade(s)`],
                ["Delivery", c.deliveryApps.join(", ") || "—"],
                ["Horário", c.hours],
                ["CEP", c.zip],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{k}</dt>
                  <dd className="mt-0.5 text-sm text-ink-800">{v || "—"}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 border-t border-ink-100 pt-4">
              <p className="label">Procedência</p>
              <ul className="flex flex-wrap gap-2">
                {c.sources.map((s) => (
                  <li key={s.label} className="chip border-ink-200 bg-ink-50 text-ink-600">
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {irmas.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
                <Building2 size={16} /> Outras unidades da mesma marca
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {irmas.map((u) => (
                  <li key={u.id}>
                    <Link href={`/empresa/${u.id}`} className="block rounded-lg border border-ink-200 px-3 py-2 text-sm hover:bg-ink-50">
                      <span className="font-medium text-ink-800">{u.name}</span>
                      <span className="block text-xs text-ink-500">{u.neighborhood}, {u.city}/{u.uf}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lead && activities.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold text-ink-900">Histórico</h2>
              <ol className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    <div>
                      <p className="text-sm text-ink-800">{a.message}</p>
                      <p className="text-[11px] text-ink-400">
                        {new Date(a.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* ---------------- Coluna lateral ---------------- */}
        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-ink-900">Contato</h2>
            <ul className="space-y-2 text-sm">
              {c.whatsapp && (
                <li>
                  <a
                    className="flex items-center gap-2 text-ink-700 hover:text-brand-600"
                    href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <MessageCircle size={14} className="text-emerald-600" /> {c.whatsapp}
                  </a>
                </li>
              )}
              {c.phone && (
                <li>
                  <a className="flex items-center gap-2 text-ink-700 hover:text-brand-600" href={`tel:${c.phone.replace(/\D/g, "")}`}>
                    <Phone size={14} /> {c.phone}
                  </a>
                </li>
              )}
              {c.email && (
                <li>
                  <a className="flex items-center gap-2 text-ink-700 hover:text-brand-600" href={`mailto:${c.email}`}>
                    <Mail size={14} /> {c.email}
                  </a>
                </li>
              )}
              {c.website && (
                <li>
                  <a className="flex items-center gap-2 text-ink-700 hover:text-brand-600" href={c.website} target="_blank" rel="noreferrer noopener">
                    <Globe size={14} /> {c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </a>
                </li>
              )}
              {c.instagram && (
                <li>
                  <a
                    className="flex items-center gap-2 text-ink-700 hover:text-brand-600"
                    href={`https://instagram.com/${c.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Instagram size={14} /> {c.instagram}
                  </a>
                </li>
              )}
              {c.linkedin && (
                <li>
                  <a
                    className="flex items-center gap-2 text-ink-700 hover:text-[#0a66c2]"
                    href={c.linkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Linkedin size={14} /> página da empresa
                  </a>
                </li>
              )}
              {c.hours && (
                <li className="flex items-center gap-2 text-ink-500">
                  <Clock size={14} /> {c.hours}
                </li>
              )}
            </ul>
          </section>

          <section className="card overflow-hidden">
            <div className="h-52">
              <MapPanel
                points={[{ id: c.id, name: c.name, lat: c.lat, lng: c.lng, score: score.total, tier: score.tier, saved: !!lead }]}
                center={{ lat: c.lat, lng: c.lng }}
                radiusKm={null}
              />
            </div>
          </section>

          {lead ? (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold text-ink-900">Lead no CRM</h2>
              <LeadControls
                leadId={lead.id}
                stage={lead.stage}
                note={lead.note}
                estimatedValue={lead.estimatedValue}
                onDeleted={`/buscar?segment=${c.segmentSlug}`}
              />
            </section>
          ) : (
            <section className="card p-5">
              <h2 className="font-semibold text-ink-900">Ainda não é um lead</h2>
              <p className="mt-1 mb-3 text-sm text-ink-500">
                Salve para acompanhar no CRM, anotar contatos e organizar em listas.
              </p>
              <SaveLeadButton companyId={c.id} savedLeadId={null} lists={lists} />
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-2 font-semibold text-ink-900">Sinais da operação</h2>
            <ul className="space-y-1.5 text-sm text-ink-600">
              <li>~{records.employeesEstimate} funcionários estimados</li>
              <li>{records.qsa.length} sócio(s) no quadro societário</li>
              <li>{records.mentions.filter((m) => m.fonte === "LinkedIn").length} perfil(is) público(s) no LinkedIn</li>
              <li>{segment.labels.volumeSignal}: {c.reviewsCount?.toLocaleString("pt-BR") ?? 0} avaliações</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
