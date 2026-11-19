"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, Plus, Upload, UserPlus } from "lucide-react";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// Cadastro manual + importação de planilha (CSV).
// A planilha é lida no navegador; o servidor só recebe as linhas já mapeadas,
// em lotes de 100 — assim uma planilha grande não estoura o tempo da Vercel.
// ---------------------------------------------------------------------------

type Segmento = { slug: string; name: string; emoji: string; subsegments: { slug: string; name: string }[] };
type Lista = { id: string; name: string; segmentSlug: string };

type Campo =
  | "nome" | "cnpj" | "telefone" | "whatsapp" | "email" | "site" | "instagram" | "linkedin"
  | "cidade" | "uf" | "bairro" | "endereco" | "decisor" | "cargoDecisor" | "emailDecisor"
  | "telefoneDecisor" | "linkedinDecisor" | "observacao";

const CAMPOS: { campo: Campo; rotulo: string; sinonimos: string[] }[] = [
  { campo: "nome", rotulo: "Nome da empresa *", sinonimos: ["empresa", "nome", "nome fantasia", "fantasia", "razao social", "company", "name", "title", "cliente"] },
  { campo: "cnpj", rotulo: "CNPJ", sinonimos: ["cnpj", "documento"] },
  { campo: "telefone", rotulo: "Telefone", sinonimos: ["telefone", "fone", "phone", "tel", "celular", "contato"] },
  { campo: "whatsapp", rotulo: "WhatsApp", sinonimos: ["whatsapp", "whats", "zap", "wpp"] },
  { campo: "email", rotulo: "E-mail da empresa", sinonimos: ["email", "e-mail", "emails", "mail"] },
  { campo: "site", rotulo: "Site", sinonimos: ["site", "website", "url", "web", "domain", "dominio"] },
  { campo: "instagram", rotulo: "Instagram", sinonimos: ["instagram", "insta", "instagrams"] },
  { campo: "linkedin", rotulo: "LinkedIn da empresa", sinonimos: ["linkedin empresa", "linkedins", "linkedin"] },
  { campo: "cidade", rotulo: "Cidade", sinonimos: ["cidade", "city", "municipio"] },
  { campo: "uf", rotulo: "UF", sinonimos: ["uf", "estado", "state"] },
  { campo: "bairro", rotulo: "Bairro", sinonimos: ["bairro", "neighborhood", "regiao"] },
  { campo: "endereco", rotulo: "Endereço", sinonimos: ["endereco", "address", "rua", "logradouro", "street"] },
  { campo: "decisor", rotulo: "Decisor (nome)", sinonimos: ["decisor", "responsavel", "contato nome", "socio", "dono", "proprietario"] },
  { campo: "cargoDecisor", rotulo: "Cargo do decisor", sinonimos: ["cargo decisor", "cargo_decisor", "cargo", "funcao", "role"] },
  { campo: "emailDecisor", rotulo: "E-mail do decisor", sinonimos: ["email decisor", "email_decisor"] },
  { campo: "telefoneDecisor", rotulo: "Telefone do decisor", sinonimos: ["telefone decisor", "telefone_decisor", "celular decisor"] },
  { campo: "linkedinDecisor", rotulo: "LinkedIn do decisor", sinonimos: ["linkedin decisor", "linkedin_decisor"] },
  { campo: "observacao", rotulo: "Observação", sinonimos: ["observacao", "obs", "nota", "notas", "comentario", "note"] },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();

/** CSV com aspas, quebra de linha dentro de campo, e separador `,` `;` ou tab. */
export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].map((c) => [c, primeira.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
      continue;
    }
    if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((c) => c.trim())) linhas.push(linha);
      linha = [];
    } else campo += ch;
  }
  linha.push(campo);
  if (linha.some((c) => c.trim())) linhas.push(linha);
  return linhas;
}

function mapearAutomatico(cabecalho: string[]): Record<Campo, number | null> {
  const mapa = Object.fromEntries(CAMPOS.map((c) => [c.campo, null])) as Record<Campo, number | null>;
  const usados = new Set<number>();
  const cab = cabecalho.map(norm);
  // Duas passadas: primeiro nome exato, depois "contém" — evita "email" roubar "email decisor".
  for (const exato of [true, false]) {
    for (const c of CAMPOS) {
      if (mapa[c.campo] != null) continue;
      const idx = cab.findIndex(
        (h, i) => !usados.has(i) && c.sinonimos.some((s) => (exato ? h === s : h.includes(s))),
      );
      if (idx >= 0) { mapa[c.campo] = idx; usados.add(idx); }
    }
  }
  return mapa;
}

type Resultado =
  | { linha: number; status: "base"; empresa: string; leadId: string; como: string }
  | { linha: number; status: "nova" | "repetida"; empresa: string; leadId: string }
  | { linha: number; status: "erro"; empresa: string; erro: string };

const LOTE = 100;

export function ImportarLeads({
  segmentos,
  segmentoInicial,
  listas,
}: {
  segmentos: Segmento[];
  segmentoInicial: string;
  listas: Lista[];
}) {
  const [aba, setAba] = useState<"manual" | "planilha">("planilha");
  const [segmento, setSegmento] = useState(segmentoInicial);
  const seg = segmentos.find((s) => s.slug === segmento) ?? segmentos[0];
  const [subsegmento, setSubsegmento] = useState(seg.subsegments[0]?.slug ?? "");
  const [listaId, setListaId] = useState("");
  const listasDoSegmento = listas.filter((l) => l.segmentSlug === seg.slug);

  // Planilha
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [tabela, setTabela] = useState<string[][]>([]);
  const [mapa, setMapa] = useState<Record<Campo, number | null> | null>(null);

  // Manual
  const [form, setForm] = useState<Partial<Record<Campo, string>>>({});

  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const cabecalho = tabela[0] ?? [];
  const corpo = tabela.slice(1);

  function trocarSegmento(slug: string) {
    setSegmento(slug);
    const s = segmentos.find((x) => x.slug === slug);
    setSubsegmento(s?.subsegments[0]?.slug ?? "");
    setListaId("");
  }

  async function lerArquivo(f: File | undefined) {
    if (!f) return;
    setResultados(null);
    setErro(null);
    if (/\.xlsx?$/i.test(f.name)) {
      setErro("Planilha do Excel: abra no Excel/Google Sheets e salve como CSV (Arquivo → Salvar como → CSV).");
      return;
    }
    let texto = await f.text();
    // CSV salvo pelo Excel em português costuma vir em Windows-1252.
    if (texto.includes("�")) texto = new TextDecoder("windows-1252").decode(await f.arrayBuffer());
    const t = lerCsv(texto);
    if (t.length < 2) {
      setErro("Não encontrei linhas na planilha. A primeira linha precisa ser o cabeçalho.");
      return;
    }
    setArquivo(f.name);
    setTabela(t);
    setMapa(mapearAutomatico(t[0]));
  }

  const linhasMapeadas = useMemo(() => {
    if (!mapa) return [];
    return corpo
      .map((r) => {
        const o: Record<string, string | null> = {};
        for (const c of CAMPOS) {
          const idx = mapa[c.campo];
          o[c.campo] = idx == null ? null : (r[idx] ?? "").trim() || null;
        }
        return o;
      })
      .filter((o) => o.nome);
  }, [corpo, mapa]);

  async function enviar(linhas: Record<string, string | null | undefined>[]) {
    setEnviando(true);
    setErro(null);
    setResultados(null);
    setProgresso(0);
    const todos: Resultado[] = [];
    try {
      for (let i = 0; i < linhas.length; i += LOTE) {
        const lote = linhas.slice(i, i + LOTE);
        const res = await fetch("/api/leads/importar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ segmento: seg.slug, subsegmento, listaId: listaId || null, linhas: lote }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha ao importar.");
        todos.push(...(data.resultados as Resultado[]).map((r) => ({ ...r, linha: r.linha + i })));
        setProgresso(Math.min(linhas.length, i + LOTE));
      }
      setResultados(todos);
    } catch (e) {
      setErro((e as Error).message);
      if (todos.length) setResultados(todos);
    } finally {
      setEnviando(false);
    }
  }

  const resumo = resultados && {
    base: resultados.filter((r) => r.status === "base").length,
    nova: resultados.filter((r) => r.status === "nova").length,
    repetida: resultados.filter((r) => r.status === "repetida").length,
    erro: resultados.filter((r) => r.status === "erro").length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Destino */}
      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="imp-seg">Segmento</label>
          <select id="imp-seg" className="input" value={seg.slug} onChange={(e) => trocarSegmento(e.target.value)}>
            {segmentos.map((s) => (
              <option key={s.slug} value={s.slug}>{s.emoji} {s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="imp-sub">Tipo de empresa (empresas novas)</label>
          <select id="imp-sub" className="input" value={subsegmento} onChange={(e) => setSubsegmento(e.target.value)}>
            {seg.subsegments.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="imp-lista">Salvar também na lista</label>
          <select id="imp-lista" className="input" value={listaId} onChange={(e) => setListaId(e.target.value)}>
            <option value="">— nenhuma —</option>
            {listasDoSegmento.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          className={clsx("chip", aba === "planilha" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600")}
          onClick={() => setAba("planilha")}
        >
          <FileSpreadsheet size={14} /> Importar planilha
        </button>
        <button
          className={clsx("chip", aba === "manual" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600")}
          onClick={() => setAba("manual")}
        >
          <UserPlus size={14} /> Cadastrar um lead
        </button>
      </div>

      {aba === "planilha" && (
        <div className="card space-y-4 p-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-ink-200 p-6 text-center hover:bg-ink-50">
            <Upload size={22} className="text-ink-400" />
            <span className="text-sm font-medium text-ink-800">
              {arquivo ? `${arquivo} — ${corpo.length} linhas` : "Escolher arquivo CSV"}
            </span>
            <span className="text-xs text-ink-500">
              Primeira linha = cabeçalho. Colunas reconhecidas: empresa, cnpj, telefone, whatsapp, email, site,
              instagram, cidade, bairro, decisor, cargo_decisor, observacao…
            </span>
            <input type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={(e) => lerArquivo(e.target.files?.[0])} />
          </label>

          {mapa && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-ink-800">Confira as colunas</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {CAMPOS.map((c) => (
                    <div key={c.campo}>
                      <label className="label">{c.rotulo}</label>
                      <select
                        className="input"
                        value={mapa[c.campo] ?? ""}
                        onChange={(e) =>
                          setMapa({ ...mapa, [c.campo]: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      >
                        <option value="">— não usar —</option>
                        {cabecalho.map((h, i) => (
                          <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-ink-500">
                    <tr>
                      <th className="py-1 pr-3">Empresa</th>
                      <th className="py-1 pr-3">CNPJ</th>
                      <th className="py-1 pr-3">Telefone</th>
                      <th className="py-1 pr-3">Cidade</th>
                      <th className="py-1 pr-3">Decisor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasMapeadas.slice(0, 5).map((l, i) => (
                      <tr key={i} className="border-t border-ink-100 text-ink-700">
                        <td className="py-1 pr-3">{l.nome}</td>
                        <td className="py-1 pr-3">{l.cnpj ?? "—"}</td>
                        <td className="py-1 pr-3">{l.telefone ?? l.whatsapp ?? "—"}</td>
                        <td className="py-1 pr-3">{l.cidade ?? "—"}</td>
                        <td className="py-1 pr-3">{l.decisor ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {linhasMapeadas.length > 5 && (
                  <p className="mt-1 text-xs text-ink-500">…e mais {linhasMapeadas.length - 5} linhas.</p>
                )}
              </div>

              <button
                className="btn-brand"
                disabled={enviando || mapa.nome == null || !linhasMapeadas.length}
                onClick={() => enviar(linhasMapeadas)}
              >
                {enviando && <Loader2 size={14} className="animate-spin" />}
                {enviando
                  ? `Importando ${progresso}/${linhasMapeadas.length}…`
                  : `Importar ${linhasMapeadas.length} leads`}
              </button>
              {mapa.nome == null && (
                <p className="text-xs text-red-600">Escolha qual coluna tem o nome da empresa.</p>
              )}
            </>
          )}
        </div>
      )}

      {aba === "manual" && (
        <form
          className="card space-y-4 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.nome?.trim()) enviar([form]);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["nome", "Nome da empresa *"], ["cnpj", "CNPJ"], ["telefone", "Telefone"],
                ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["site", "Site"],
                ["instagram", "Instagram"], ["cidade", "Cidade"], ["bairro", "Bairro"],
                ["decisor", "Decisor (nome)"], ["cargoDecisor", "Cargo do decisor"], ["emailDecisor", "E-mail do decisor"],
              ] as [Campo, string][]
            ).map(([campo, rotulo]) => (
              <div key={campo}>
                <label className="label" htmlFor={`m-${campo}`}>{rotulo}</label>
                <input
                  id={`m-${campo}`}
                  className="input"
                  value={form[campo] ?? ""}
                  required={campo === "nome"}
                  onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="m-obs">Observação</label>
            <textarea
              id="m-obs"
              className="input min-h-20"
              value={form.observacao ?? ""}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            />
          </div>
          <button className="btn-brand" disabled={enviando || !form.nome?.trim()}>
            {enviando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} Salvar lead
          </button>
        </form>
      )}

      {erro && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {resultados && resumo && (
        <div className="card space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {resumo.base + resumo.nova} leads salvos
          </p>
          <ul className="grid gap-1 text-sm text-ink-600 sm:grid-cols-2">
            <li><b className="text-ink-900">{resumo.base}</b> reconhecidos na base (com sócio da Receita)</li>
            <li><b className="text-ink-900">{resumo.nova}</b> cadastrados como empresa nova (só você vê)</li>
            <li><b className="text-ink-900">{resumo.repetida}</b> já estavam nos seus leads</li>
            <li><b className="text-ink-900">{resumo.erro}</b> com erro</li>
          </ul>
          {resumo.erro > 0 && (
            <ul className="text-xs text-red-700">
              {resultados.filter((r) => r.status === "erro").slice(0, 20).map((r) => (
                <li key={r.linha}>Linha {r.linha + 1}: {r.empresa} — {"erro" in r ? r.erro : ""}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Link href={`/leads?segment=${seg.slug}`} className="btn-primary">Ver meus leads</Link>
            {listaId && <Link href={`/listas/${listaId}`} className="btn-ghost">Abrir a lista</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
