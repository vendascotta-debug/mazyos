import Link from "next/link";
import clsx from "clsx";
import { MapPin, Phone, Star, UserRound, Linkedin, Building2, Globe, Instagram, Mail, MessageCircle } from "lucide-react";
import type { CompanyResult } from "@/lib/types";
import { ScoreBadge, StageBadge, ConfidenceBadge } from "@/components/ui";
import { ROLE_LABEL, bestDecisionMaker } from "@/lib/decisores";
import { SaveLeadButton } from "@/components/SaveLeadButton";
import { getSegment } from "@/lib/segments";

export function CompanyCard({
  result,
  lists,
  compact = false,
}: {
  result: CompanyResult;
  lists: { id: string; name: string }[];
  compact?: boolean;
}) {
  const { company: c, score, decisionMakers, distanceKm, savedLeadId, savedStage } = result;
  const sub = getSegment(c.segmentSlug).subsegments.find((s) => s.slug === c.subsegmentSlug);
  const decisor = bestDecisionMaker(decisionMakers);
  const nomeados = decisionMakers.filter((d) => d.name && !d.inferred).length;

  return (
    <article className={clsx("card transition-shadow hover:shadow-md", compact ? "p-3.5" : "p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/empresa/${c.id}`}
              className={clsx("font-semibold text-ink-900 hover:text-brand-600", compact ? "text-sm" : "text-[15px]")}
            >
              {c.name}
            </Link>
            <ScoreBadge score={score.total} tier={score.tier} size={compact ? "sm" : "md"} />
            {savedStage && <StageBadge stage={savedStage} />}
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            <span className="chip border-ink-200 bg-ink-50 text-ink-600">{sub?.name ?? c.subsegmentSlug}</span>
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {c.neighborhood}, {c.city}/{c.uf}
              {distanceKm != null && <span className="text-ink-400">· {distanceKm.toFixed(1)} km</span>}
            </span>
            {c.reviewsCount ? (
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                {c.rating?.toFixed(1)} ({c.reviewsCount.toLocaleString("pt-BR")})
              </span>
            ) : null}
            {c.phone && (
              <span className="flex items-center gap-1">
                <Phone size={12} /> {c.whatsapp ?? c.phone}
              </span>
            )}
            {c.porte && (
              <span className="flex items-center gap-1">
                <Building2 size={12} /> {c.porte} · {c.employeesRange} func.
              </span>
            )}
          </p>
        </div>

        {!compact && <SaveLeadButton companyId={c.id} savedLeadId={savedLeadId} lists={lists} />}
      </div>

      {/* Contatos da empresa direto no resultado — sem precisar abrir a ficha. */}
      {(c.whatsapp || c.email || c.website || c.instagram || c.linkedin) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {c.whatsapp && (
            <a
              href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer noopener"
              className="chip border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              title={`WhatsApp ${c.whatsapp}`}
            >
              <MessageCircle size={11} /> WhatsApp
            </a>
          )}
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              className="chip border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
              title={c.email}
            >
              <Mail size={11} /> {c.email.length > 26 ? "e-mail" : c.email}
            </a>
          )}
          {c.website && (
            <a
              href={c.website}
              target="_blank"
              rel="noreferrer noopener"
              className="chip border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
              title={c.website}
            >
              <Globe size={11} /> {c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          )}
          {c.instagram && (
            <a
              href={`https://instagram.com/${c.instagram.replace("@", "")}`}
              target="_blank"
              rel="noreferrer noopener"
              className="chip border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100"
            >
              <Instagram size={11} /> {c.instagram}
            </a>
          )}
          {c.linkedin && (
            <a
              href={c.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              className="chip border-[#0a66c2]/25 bg-[#0a66c2]/5 text-[#0a66c2] hover:bg-[#0a66c2]/10"
              title="Página da empresa no LinkedIn"
            >
              <Linkedin size={11} /> empresa
            </a>
          )}
        </div>
      )}

      {/* Bloco de decisor: o dado que o usuário veio buscar, já na lista. */}
      <div
        className={clsx(
          "mt-3.5 rounded-lg border px-3 py-2.5",
          decisor?.name ? "border-brand-100 bg-brand-50/60" : "border-ink-200 bg-ink-50",
        )}
      >
        {decisor ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                <UserRound size={14} className="text-brand-600 shrink-0" />
                {decisor.name ?? <span className="text-ink-600">Decisor provável: {decisor.role}</span>}
                {decisor.linkedin && (
                  <a
                    href={decisor.linkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-ink-400 hover:text-[#0a66c2]"
                    title="Perfil público no LinkedIn"
                  >
                    <Linkedin size={13} />
                  </a>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {decisor.name ? `${decisor.role} · ${decisor.source}` : decisor.evidence.slice(0, 90) + "…"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="chip border-ink-200 bg-white text-ink-600">{ROLE_LABEL[decisor.roleCategory]}</span>
              <ConfidenceBadge confidence={decisor.confidence} />
              {nomeados > 1 && (
                <span className="chip border-ink-200 bg-white text-ink-500">+{nomeados - 1} nome(s)</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-500">Nenhum decisor localizado em fonte pública.</p>
        )}
      </div>

      {compact && (
        <div className="mt-3 flex justify-end">
          <SaveLeadButton companyId={c.id} savedLeadId={savedLeadId} lists={lists} size="sm" />
        </div>
      )}
    </article>
  );
}
