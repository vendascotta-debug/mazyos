// Teste ponta a ponta do MVP do LINKFIVE, contra o servidor de dev.
// Cobre: cadastro, isolamento entre contas, criacao de link, limite de plano,
// publicacao, pagina publica, registro de view e clique.

const BASE = "http://localhost:3000";

let falhas = 0;
function checa(nome, condicao, extra = "") {
  const marca = condicao ? "PASSOU" : "FALHOU";
  if (!condicao) falhas++;
  console.log(`[${marca}] ${nome}${extra ? ` — ${extra}` : ""}`);
}

/** fetch que guarda o cookie de sessao por conta. */
function sessao() {
  let cookie = "";
  return async (caminho, opcoes = {}) => {
    const r = await fetch(BASE + caminho, {
      ...opcoes,
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...(opcoes.headers ?? {}),
      },
      redirect: "manual",
    });
    const set = r.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return r;
  };
}

const marca = Date.now().toString(36);

// --- Conta A ---------------------------------------------------------------
const a = sessao();
const slugA = `teste-a-${marca}`;
let r = await a("/api/auth/cadastro", {
  method: "POST",
  body: JSON.stringify({
    nome: "Padaria Teste",
    email: `a-${marca}@teste.com`,
    senha: "senha12345",
    slug: slugA,
  }),
});
checa("cadastro da conta A", r.ok);

// --- Conta B ---------------------------------------------------------------
const b = sessao();
const slugB = `teste-b-${marca}`;
r = await b("/api/auth/cadastro", {
  method: "POST",
  body: JSON.stringify({
    nome: "Loja Teste",
    email: `b-${marca}@teste.com`,
    senha: "senha12345",
    slug: slugB,
  }),
});
checa("cadastro da conta B", r.ok);

// --- Descobre o pageId de cada conta ---------------------------------------
r = await a("/api/pagina");
const infoA = await r.json();
r = await b("/api/pagina");
const infoB = await r.json();
checa("conta A tem pagina", Boolean(infoA.pageId));
checa("conta B tem pagina", Boolean(infoB.pageId));

// --- ISOLAMENTO: A tenta criar link na pagina de B -------------------------
r = await a("/api/links", {
  method: "POST",
  body: JSON.stringify({
    pageId: infoB.pageId,
    type: "link",
    title: "Invasao",
    url: "https://exemplo.com",
  }),
});
checa("A NAO consegue criar link na pagina de B", r.status === 404, `status ${r.status}`);

// --- ISOLAMENTO: A tenta listar links de B ---------------------------------
r = await a(`/api/links?pageId=${infoB.pageId}`);
const listados = await r.json();
checa(
  "A NAO enxerga links de B",
  Array.isArray(listados.links) && listados.links.length === 0,
  `recebeu ${listados.links?.length ?? "?"}`,
);

// --- WhatsApp: criacao e montagem da URL -----------------------------------
r = await a("/api/links", {
  method: "POST",
  body: JSON.stringify({
    pageId: infoA.pageId,
    type: "whatsapp",
    title: "Falar no WhatsApp",
    config: { numero: "11973933648", mensagem: "Ola, quero um orcamento." },
  }),
});
const criado = await r.json();
const linkWhats = criado.link;
checa("cria link de WhatsApp", r.ok && Boolean(linkWhats));
checa(
  "URL do WhatsApp sai com DDI e mensagem",
  linkWhats?.url?.startsWith("https://wa.me/5511973933648?text=") === true,
  linkWhats?.url,
);

// --- Limite do plano Free (5 links) ----------------------------------------
for (let i = 2; i <= 5; i++) {
  await a("/api/links", {
    method: "POST",
    body: JSON.stringify({
      pageId: infoA.pageId,
      type: "link",
      title: `Link ${i}`,
      url: "https://exemplo.com",
    }),
  });
}
r = await a("/api/links", {
  method: "POST",
  body: JSON.stringify({
    pageId: infoA.pageId,
    type: "link",
    title: "Sexto link",
    url: "https://exemplo.com",
  }),
});
checa("plano Free barra o 6o link", r.status === 402, `status ${r.status}`);

// --- Pagina em rascunho responde 404 ---------------------------------------
r = await fetch(`${BASE}/${slugA}`, { redirect: "manual" });
checa("pagina em rascunho responde 404", r.status === 404, `status ${r.status}`);

// --- Publicar ---------------------------------------------------------------
r = await a("/api/pagina/publicar", {
  method: "POST",
  body: JSON.stringify({ pageId: infoA.pageId, publicar: true }),
});
checa("publica a pagina", r.ok);

r = await fetch(`${BASE}/${slugA}`);
const html = await r.text();
checa("pagina publica abre", r.status === 200, `status ${r.status}`);
checa("pagina publica mostra o botao do WhatsApp", html.includes("Falar no WhatsApp"));
checa("pagina publica traz o link wa.me", html.includes("wa.me/5511973933648"));

// --- Eventos: view e clique -------------------------------------------------
r = await fetch(`${BASE}/api/eventos`, {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone)" },
  body: JSON.stringify({ tipo: "view", slug: slugA }),
});
checa("registra visualizacao", r.ok);

r = await fetch(`${BASE}/api/eventos`, {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone)" },
  body: JSON.stringify({ tipo: "click", slug: slugA, linkId: linkWhats.id }),
});
checa("registra clique", r.ok);

// Bot nao conta
r = await fetch(`${BASE}/api/eventos`, {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Googlebot/2.1" },
  body: JSON.stringify({ tipo: "view", slug: slugA }),
});
const respBot = await r.json();
checa("bot nao conta como visualizacao", respBot.ignorado === "bot");

// Clique com link de outra pagina nao conta
r = await fetch(`${BASE}/api/eventos`, {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone)" },
  body: JSON.stringify({ tipo: "click", slug: slugB, linkId: linkWhats.id }),
});
checa("clique com link de outra pagina e recusado", r.status === 404, `status ${r.status}`);

// --- Os numeros chegaram no painel? ----------------------------------------
r = await a("/api/pagina");
const depois = await r.json();
checa("contador de visualizacao subiu", depois.totais.views >= 1, `views=${depois.totais.views}`);
checa("contador de clique subiu", depois.totais.clicks >= 1, `clicks=${depois.totais.clicks}`);
checa(
  "clique no WhatsApp foi contado separado",
  depois.totais.whatsappClicks >= 1,
  `whatsapp=${depois.totais.whatsappClicks}`,
);

// --- QR Code ---------------------------------------------------------------
r = await a("/api/qrcode?formato=svg");
const svg = await r.text();
checa("QR Code gera SVG", r.ok && svg.includes("<svg"));

r = await a("/api/qrcode?formato=png&tamanho=512");
checa("QR Code gera PNG", r.ok && r.headers.get("content-type") === "image/png");

// --- Sem sessao nao acessa nada --------------------------------------------
r = await fetch(`${BASE}/api/links?pageId=${infoA.pageId}`);
checa("sem sessao a API recusa", r.status === 401, `status ${r.status}`);

console.log(falhas === 0 ? "\nTUDO PASSOU" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
