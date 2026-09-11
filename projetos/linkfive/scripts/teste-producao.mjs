// ---------------------------------------------------------------------------
// Conferência de produção — SÓ LEITURA.
//
//   npm run teste:producao
//
// A bateria completa (`npm run teste`) cria contas, páginas e links para poder
// testar o produto de verdade. Contra produção isso enche o painel de clientes
// de "Padaria Teste" e já chegou a pôr página de teste no sitemap que o Google
// lê. Por isso ela tem trava, e por isso este arquivo existe.
//
// Aqui nada é criado, alterado nem apagado. O que se afirma é o que dá para
// afirmar de fora: as páginas respondem, os caminhos privados continuam
// fechados, os preços na tela são os que a gente publicou, e os endereços de
// cobrança são os atuais.
//
// É o que se roda depois de cada publicação.
// ---------------------------------------------------------------------------

const BASE = process.env.LINKFIVE_URL ?? "https://linkfive.com.br";

let falhas = 0;
function checa(nome, condicao, extra = "") {
  console.log(`[${condicao ? "PASSOU" : "FALHOU"}] ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!condicao) falhas++;
}

const pegar = (caminho, opcoes = {}) => fetch(BASE + caminho, { redirect: "manual", ...opcoes });

console.log(`Conferindo ${BASE}\n`);

// --- As telas abrem ---------------------------------------------------------
for (const rota of ["/", "/entrar", "/cadastrar", "/recuperar", "/redefinir", "/termos", "/privacidade"]) {
  const r = await pegar(rota);
  checa(`${rota} abre`, r.status === 200, `status ${r.status}`);
}

// --- O que o Google pode varrer ---------------------------------------------
let r = await pegar("/robots.txt");
const robots = await r.text();
checa("robots.txt responde", r.status === 200, `status ${r.status}`);
for (const bloqueado of ["/w/", "/app/", "/admin/", "/api/"]) {
  checa(`robots bloqueia ${bloqueado}`, robots.includes(`Disallow: ${bloqueado}`));
}

r = await pegar("/sitemap.xml");
const mapa = await r.text();
checa("sitemap responde", r.status === 200, `status ${r.status}`);
checa("sitemap é XML válido", mapa.startsWith("<?xml") && mapa.includes("<urlset"));
checa("sitemap NÃO expõe link curto", !mapa.includes("/w/"));
checa("sitemap NÃO expõe painel", !mapa.includes("/app") && !mapa.includes("/admin"));
checa(
  "sitemap NÃO expõe página de teste",
  !/\/teste-|\/upload-|\/logo-|\/convidado-/.test(mapa),
  "nenhum resquício de bateria",
);

// --- Um host só -------------------------------------------------------------
r = await fetch("https://www.linkfive.com.br/entrar", { redirect: "manual" });
checa(
  "www redireciona para o apex",
  r.status === 308 && (r.headers.get("location") ?? "").startsWith("https://linkfive.com.br/"),
  `${r.status} ${r.headers.get("location") ?? ""}`,
);

// --- O que precisa continuar fechado ----------------------------------------
r = await pegar("/api/curtos");
checa("deslogado NÃO lê links de ninguém", r.status === 401, `status ${r.status}`);

r = await pegar("/api/upload", { method: "POST", body: new FormData() });
checa("deslogado NÃO envia imagem", r.status === 401, `status ${r.status}`);

r = await pegar("/api/admin/cliente/u_qualquer", { method: "DELETE" });
checa("deslogado NÃO exclui conta", r.status === 401, `status ${r.status}`);

r = await pegar("/api/webhooks/stripe", {
  method: "POST",
  headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=forjada" },
  body: JSON.stringify({ type: "checkout.session.completed", data: { object: {} } }),
});
checa("webhook recusa assinatura forjada", r.status === 401, `status ${r.status}`);

r = await pegar("/app");
checa("o painel exige login", r.status === 307 || r.status === 302, `status ${r.status}`);

// --- A cobrança está armada -------------------------------------------------
r = await pegar("/api/webhooks/stripe");
const stripe = await r.json();
checa("webhook do Stripe configurado", stripe.configurado === true);
checa("com os identificadores mapeados", stripe.precosMapeados >= 8, `${stripe.precosMapeados}`);

// --- Os preços na tela são os publicados ------------------------------------
const { PLANOS } = await import(new URL("../src/lib/limites.ts", import.meta.url).href);
const landing = await (await pegar("/")).text();

for (const id of ["starter", "pro"]) {
  const p = PLANOS[id];
  const anual = (p.precoAnualCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  checa(`o preço anual do ${p.nome} na tela é o da tabela`, landing.includes(anual), `R$ ${anual}`);
}

const checkouts = [...new Set(landing.match(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g) ?? [])];
checa("os 4 links de cobrança estão na página", checkouts.length === 4, `${checkouts.length}`);

// Link de checkout morto é venda perdida sem ninguém perceber.
for (const u of checkouts) {
  const pagina = await fetch(u, { redirect: "follow" });
  const corpo = await pagina.text();
  checa(
    `o checkout ${u.slice(-8)} está ativo`,
    pagina.ok && !/no longer active|não está aceitando/i.test(corpo),
    pagina.ok ? "aceita compra" : `status ${pagina.status}`,
  );
}

// --- A capa de compartilhamento -------------------------------------------

// O WhatsApp descarta a miniatura acima de ~300 KB: mostra o texto e desiste
// da figura. Foi o que aconteceu ate 11/09/2026, quando a capa era a logo crua
// do cliente (a do Cotta tinha 589 KB). Link sem previa recebe menos clique,
// entao isso e receita, nao estetica.
for (const pagina of ["/cottafoodservice", "/oficinadocarlos"]) {
  const html = await (await pegar(pagina)).text();
  const capa = html.match(/og:image" content="([^"]+)"/)?.[1];
  checa(`${pagina} declara capa`, Boolean(capa));
  checa(`${pagina} declara o tamanho da capa`, /og:image:width" content="1200"/.test(html));

  if (capa) {
    const img = await fetch(capa.startsWith("http") ? capa : BASE + capa);
    const kb = (await img.arrayBuffer()).byteLength / 1024;
    checa(`a capa de ${pagina} responde`, img.ok, `status ${img.status}`);
    checa(`e cabe na miniatura do WhatsApp`, kb < 300, `${kb.toFixed(0)} KB`);
  }
}

// --- A demonstração continua de pé ------------------------------------------
r = await pegar("/oficinadocarlos");
checa("a página de demonstração abre", r.status === 200, `status ${r.status}`);

console.log(falhas === 0 ? "\nTUDO PASSOU" : `\n${falhas} FALHA(S)`);
process.exitCode = falhas === 0 ? 0 : 1;
