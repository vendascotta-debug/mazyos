import { createRequire } from "node:module";
const require = createRequire("C:/Users/User/MazyOS/prospecta/package.json");
const { chromium } = require("playwright");

const nav = await chromium.launch();

// 1. Comportamento normal: as seções entram quando aparecem na tela.
const p = await nav.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://localhost:3000", { waitUntil: "networkidle" });

const antes = await p.$$eval(".revelar", (els) => els.filter((e) => e.classList.contains("visivel")).length);
const total = await p.$$eval(".revelar", (els) => els.length);

// Rola aos poucos, como uma pessoa faz. Um salto instantaneo ate o rodape
// nao faz os elementos do meio cruzarem a viewport, e o observador
// (corretamente) nao dispara para eles.
for (let y = 0; y < 5000; y += 600) {
  await p.evaluate((v) => window.scrollTo(0, v), y);
  await p.waitForTimeout(220);
}
await p.waitForTimeout(600);
const depois = await p.$$eval(".revelar", (els) => els.filter((e) => e.classList.contains("visivel")).length);

console.log(`elementos animados: ${total}`);
console.log(`visíveis antes de rolar: ${antes}`);
console.log(`visíveis depois de rolar: ${depois}`);
console.log(depois > antes ? "OK: a animação dispara ao rolar" : "FALHA: nada revelou");

// 2. Quem pediu menos movimento recebe a página parada, e não invisível.
const reduzido = await nav.newContext({ reducedMotion: "reduce" });
const p2 = await reduzido.newPage();
await p2.goto("http://localhost:3000", { waitUntil: "networkidle" });
const opacidades = await p2.$$eval(".revelar", (els) =>
  els.map((e) => getComputedStyle(e).opacity),
);
const todosVisiveis = opacidades.every((o) => Number(o) === 1);
console.log(
  todosVisiveis
    ? "OK: com movimento reduzido, tudo aparece normalmente"
    : `FALHA: com movimento reduzido restou conteúdo invisível (${opacidades.join(", ")})`,
);

await nav.close();
