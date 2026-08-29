import { chromium } from "playwright";

// ---------------------------------------------------------------------------
// Confere o layout em celular, tablet e desktop de verdade, num navegador.
//
//   node scripts/testar-telas.mjs <pasta-de-saida> [porta]
//
// Além dos prints, mede o que quebra layout: elemento que estoura a largura da
// tela, rolagem lateral e presença dos controles próprios de cada tamanho.
// ---------------------------------------------------------------------------

const SAIDA = process.argv[2] ?? ".";
const BASE = `http://localhost:${process.argv[3] ?? 3013}`;
const ESPERA = 120_000;
const CONTA = { email: `telas${Date.now()}@teste.dev`, senha: "senha12345" };

const TELAS = [
  { nome: "celular", largura: 390, altura: 844, movel: true },
  { nome: "tablet", largura: 820, altura: 1180, movel: true },
  { nome: "desktop", largura: 1440, altura: 900, movel: false },
];

const PAGINAS = ["/buscar", "/leads", "/crm"];

const navegador = await chromium.launch();

// A conta é criada uma vez; cada tela apenas faz login.
const inicial = await navegador.newContext();
const cadastro = await inicial.request.post(`${BASE}/api/auth/cadastro`, {
  data: { email: CONTA.email, senha: CONTA.senha, nome: "Teste de Telas" },
});
if (!cadastro.ok()) {
  console.error("não consegui criar a conta de teste:", cadastro.status(), await cadastro.text());
  process.exit(1);
}
await inicial.close();

let problemas = 0;

for (const t of TELAS) {
  const ctx = await navegador.newContext({
    viewport: { width: t.largura, height: t.altura },
    deviceScaleFactor: 2,
    isMobile: t.movel,
    hasTouch: t.movel,
  });

  const login = await ctx.request.post(`${BASE}/api/auth/login`, { data: CONTA });
  if (!login.ok()) {
    console.error("login falhou:", login.status());
    process.exit(1);
  }

  console.log(`\n=== ${t.nome.toUpperCase()} (${t.largura}x${t.altura}) ===`);

  for (const rota of PAGINAS) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded", timeout: ESPERA });
    await p.waitForTimeout(2500);

    const d = await p.evaluate(() => {
      const largura = window.innerWidth;
      const estouram = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > largura + 2;
        })
        .slice(0, 3)
        .map((el) => {
          const c = String(el.className).split(" ").slice(0, 2).join(".");
          return `${el.tagName.toLowerCase()}${c ? "." + c : ""} (${Math.round(el.getBoundingClientRect().right)}px)`;
        });

      const visivel = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().width > 0 : false;
      };

      const card = document.querySelector("article");
      return {
        rolagemLateral: document.documentElement.scrollWidth > largura + 2,
        scrollWidth: document.documentElement.scrollWidth,
        largura,
        estouram,
        menuLateral: visivel("aside.bg-ink-950"),
        abas: visivel("nav.fixed"),
        card: card ? Math.round(card.getBoundingClientRect().width) : null,
      };
    });

    const ok = !d.rolagemLateral && d.estouram.length === 0;
    if (!ok) problemas++;

    const nome = rota.replace("/", "");
    await p.screenshot({ path: `${SAIDA}/${t.nome}-${nome}.png` });

    console.log(
      `  ${ok ? "ok    " : "QUEBRA"} ${rota.padEnd(9)} ` +
        `larg.conteúdo ${d.scrollWidth}/${d.largura}px · ` +
        `menu ${d.menuLateral ? "lateral" : "abas"} · ` +
        `card ${d.card ?? "-"}px`,
    );
    if (d.estouram.length) console.log(`         estourando: ${d.estouram.join(" | ")}`);

    await p.close();
  }

  await ctx.close();
}

await navegador.close();
console.log(`\n${problemas === 0 ? "nenhuma quebra de layout" : problemas + " problema(s) de layout"} · prints em ${SAIDA}`);
console.log(`conta de teste: ${CONTA.email}`);
