"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Copy, Globe, Instagram, Linkedin, Mail, MessageCircle, Phone } from "lucide-react";
import type { Company } from "@/lib/types";

// ---------------------------------------------------------------------------
// Canais de contato da empresa.
//
// Todos os canais aparecem sempre, mesmo os que a empresa não tem: sumir com o
// campo faz parecer que o sistema não procurou. Vazio é informação — significa
// "esse dado não existe na fonte pública", e o vendedor precisa saber disso
// antes de decidir como abordar.
// ---------------------------------------------------------------------------

/**
 * Número pronto para o WhatsApp, ou null se for fixo.
 *
 * A base da Receita guarda telefone no formato antigo, de 8 dígitos, anterior
 * ao nono dígito: "(19) 9285-7179" é celular e precisa virar 19992857179. Fixo
 * começa com 2 a 5; celular, com 6 a 9.
 */
function numeroWhatsApp(telefone: string | null): string | null {
  if (!telefone) return null;
  const d = telefone.replace(/\D/g, "");
  if (d.length < 10) return null;

  const ddd = d.slice(0, 2);
  const numero = d.slice(2);

  if (numero.length === 9 && /^9/.test(numero)) return `55${ddd}${numero}`;
  if (numero.length === 8 && /^[6-9]/.test(numero)) return `55${ddd}9${numero}`;
  return null;
}

function Copiar({ valor, rotulo }: { valor: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copiar ${rotulo}`}
      title={`Copiar ${rotulo}`}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(valor);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          // Sem permissão de área de transferência: o texto continua visível
          // e selecionável, então não vale interromper o usuário com erro.
        }
      }}
      className="ml-0.5 rounded p-0.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
    >
      {copiado ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
    </button>
  );
}


/** Chip pontilhado que leva a uma busca — para o que a Receita não publica. */
const PROCURAR = "chip border-dashed border-ink-300 bg-white text-ink-500 hover:bg-ink-50 hover:text-ink-800";

/**
 * A Receita não publica site nem rede social. Em vez de um campo morto na tela,
 * cada canal ausente vira a busca que o vendedor faria na mão — já com o nome
 * da empresa e a cidade, que é o que separa "Sodexo" de qualquer homônimo.
 */
function buscaGoogle(termos: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(termos)}`;
}

export function Contatos({ company: c, compacto = false }: { company: Company; compacto?: boolean }) {
  const zap = numeroWhatsApp(c.whatsapp ?? c.phone);
  const site = c.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

  return (
    <div className={clsx("flex flex-wrap items-center gap-1.5", compacto ? "mt-2" : "mt-2.5")}>
      {/* Telefone */}
      {c.phone ? (
        <span className="chip border-ink-200 bg-white text-ink-700">
          <a href={`tel:${c.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 hover:text-brand-600">
            <Phone size={11} /> {c.phone}
          </a>
          <Copiar valor={c.phone} rotulo="telefone" />
        </span>
      ) : (
        <a
          href={buscaGoogle(`${c.name} ${c.city} telefone`)}
          target="_blank"
          rel="noreferrer noopener"
          className={PROCURAR}
          title="Sem telefone na base da Receita — procurar no Google"
        >
          <Phone size={11} /> procurar telefone
        </a>
      )}

      {/* WhatsApp */}
      {zap ? (
        <a
          href={`https://wa.me/${zap}`}
          target="_blank"
          rel="noreferrer noopener"
          className="chip border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        >
          <MessageCircle size={11} /> WhatsApp
        </a>
      ) : (
        <a
          href={buscaGoogle(`${c.name} ${c.city} whatsapp`)}
          target="_blank"
          rel="noreferrer noopener"
          className={PROCURAR}
          title="O telefone cadastrado é fixo — procurar um WhatsApp da empresa"
        >
          <MessageCircle size={11} /> procurar WhatsApp
        </a>
      )}

      {/* E-mail: endereço inteiro, sem cortar, com botão de copiar */}
      {c.email ? (
        <span className="chip max-w-full border-ink-200 bg-white text-ink-700">
          <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-1 hover:text-brand-600">
            <Mail size={11} className="shrink-0" />
            <span className="truncate">{c.email}</span>
          </a>
          <Copiar valor={c.email} rotulo="e-mail" />
        </span>
      ) : (
        <a
          href={buscaGoogle(`${c.name} ${c.city} email contato`)}
          target="_blank"
          rel="noreferrer noopener"
          className={PROCURAR}
          title="Sem e-mail na base da Receita — procurar no Google"
        >
          <Mail size={11} /> procurar e-mail
        </a>
      )}

      {/* Site */}
      {c.website ? (
        <a
          href={c.website}
          target="_blank"
          rel="noreferrer noopener"
          className="chip border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
        >
          <Globe size={11} /> {site}
        </a>
      ) : (
        <a
          href={buscaGoogle(`${c.name} ${c.city} site oficial`)}
          target="_blank"
          rel="noreferrer noopener"
          className={PROCURAR}
          title="A Receita não publica site — procurar no Google"
        >
          <Globe size={11} /> procurar site
        </a>
      )}

      {/* Instagram */}
      {c.instagram ? (
        <a
          href={`https://instagram.com/${c.instagram.replace("@", "")}`}
          target="_blank"
          rel="noreferrer noopener"
          className="chip border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100"
        >
          <Instagram size={11} /> {c.instagram}
        </a>
      ) : (
        <a
          href={buscaGoogle(`site:instagram.com "${c.name}" ${c.city}`)}
          target="_blank"
          rel="noreferrer noopener"
          className={PROCURAR}
          title="A Receita não publica redes sociais — procurar o perfil no Instagram"
        >
          <Instagram size={11} /> procurar Instagram
        </a>
      )}

      {/* LinkedIn da empresa */}
      {c.linkedin ? (
        <a
          href={c.linkedin}
          target="_blank"
          rel="noreferrer noopener"
          className="chip border-[#0a66c2]/25 bg-[#0a66c2]/5 text-[#0a66c2] hover:bg-[#0a66c2]/10"
        >
          <Linkedin size={11} /> empresa
        </a>
      ) : (
        <a
          href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(c.name)}`}
          target="_blank"
          rel="noreferrer noopener"
          className={PROCURAR}
          title="A Receita não publica redes sociais — procurar a empresa no LinkedIn"
        >
          <Linkedin size={11} /> procurar LinkedIn
        </a>
      )}
    </div>
  );
}
