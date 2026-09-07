// Teste ponta a ponta do MVP do LINKFIVE, contra o servidor de dev.
// Cobre: cadastro, isolamento entre contas, criacao de link, limite de plano,
// publicacao, pagina publica, registro de view e clique.

const BASE = process.env.LINKFIVE_URL ?? "http://localhost:3000";

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


// --- LINKS CURTOS DIRETOS (/w/abc123) --------------------------------------

r = await a("/api/curtos", {
  method: "POST",
  body: JSON.stringify({
    title: "Anuncio de teste",
    numero: "11973933648",
    mensagem: "Vim pelo anuncio.",
  }),
});
const curtoCriado = (await r.json()).curto;
checa("cria link curto direto", r.ok && Boolean(curtoCriado?.code));

// O codigo sorteado nao usa caracteres que se confundem lidos em voz alta.
checa(
  "codigo curto evita 0/O e 1/l",
  curtoCriado && !/[0O1lI]/.test(curtoCriado.code),
  curtoCriado?.code,
);

// Redireciona para o WhatsApp, sem pagina no meio.
r = await fetch(`${BASE}/w/${curtoCriado.code}`, { redirect: "manual" });
const destino = r.headers.get("location") ?? "";
checa("link curto redireciona (307)", r.status === 307, `status ${r.status}`);
checa("redireciona para o wa.me certo", destino.startsWith("https://wa.me/5511973933648"), destino);
checa("leva a mensagem pronta junto", destino.includes("text="));

// Codigo personalizado.
// Usa a conta B: a conta A ja gastou o unico link curto do plano Free, e a
// checagem de cota acontece antes da checagem de codigo.
r = await b("/api/curtos", {
  method: "POST",
  body: JSON.stringify({ title: "Promo", numero: "11973933648", code: "promo-teste-" + marca }),
});
const curtoPersonalizado = (await r.json()).curto;
checa("aceita codigo personalizado", r.ok && curtoPersonalizado?.code === "promo-teste-" + marca);

// Codigo repetido e recusado — precisa de uma terceira conta com cota livre.
const c = sessao();
r = await c("/api/auth/cadastro", {
  method: "POST",
  body: JSON.stringify({
    nome: "Terceira Conta",
    email: `c-${marca}@teste.com`,
    senha: "senha12345",
    slug: `teste-c-${marca}`,
  }),
});
checa("cadastro da conta C", r.ok);

r = await c("/api/curtos", {
  method: "POST",
  body: JSON.stringify({ title: "Roubo", numero: "11999998888", code: "promo-teste-" + marca }),
});
checa("codigo repetido e recusado", r.status === 409, `status ${r.status}`);

// Numero invalido e recusado
r = await a("/api/curtos", {
  method: "POST",
  body: JSON.stringify({ title: "Torto", numero: "123" }),
});
checa("numero invalido e recusado", r.status === 400, `status ${r.status}`);

// ISOLAMENTO: B nao consegue mexer no link de A
r = await b(`/api/curtos/${curtoCriado.id}`, {
  method: "PATCH",
  body: JSON.stringify({ title: "Sequestrado" }),
});
checa("B NAO edita link curto de A", r.status === 404, `status ${r.status}`);

r = await b(`/api/curtos/${curtoCriado.id}`, { method: "DELETE" });
checa("B NAO exclui link curto de A", r.status === 404, `status ${r.status}`);

// O clique foi contado?
r = await a("/api/curtos");
const listaCurtos = (await r.json()).curtos;
const oCurto = listaCurtos.find((c) => c.id === curtoCriado.id);
checa("contador do link curto subiu", oCurto?.clicksTotal >= 1, `cliques=${oCurto?.clicksTotal}`);

// Bot nao infla o contador
await fetch(`${BASE}/w/${curtoCriado.code}`, {
  redirect: "manual",
  headers: { "user-agent": "WhatsApp/2.2 A" },
});
r = await a("/api/curtos");
const depoisBot = (await r.json()).curtos.find((c) => c.id === curtoCriado.id);
checa(
  "pre-visualizacao do WhatsApp nao conta clique",
  depoisBot?.clicksTotal === oCurto?.clicksTotal,
  `antes=${oCurto?.clicksTotal} depois=${depoisBot?.clicksTotal}`,
);

// Link pausado nao redireciona
await a(`/api/curtos/${curtoCriado.id}`, {
  method: "PATCH",
  body: JSON.stringify({ active: false }),
});
r = await fetch(`${BASE}/w/${curtoCriado.code}`, { redirect: "manual" });
checa(
  "link pausado nao leva ao WhatsApp",
  (r.headers.get("location") ?? "").includes("link=indisponivel"),
  r.headers.get("location") ?? "",
);

// QR por link curto
r = await a(`/api/qrcode?curto=${curtoCriado.id}&formato=svg`);
const svgCurto = await r.text();
checa("QR do link curto sai em SVG", r.ok && svgCurto.includes("<svg"));

// QR de link de outra conta e recusado
r = await b(`/api/qrcode?curto=${curtoCriado.id}&formato=svg`);
checa("B NAO baixa o QR do link de A", r.status === 404, `status ${r.status}`);

// Limite do plano Free: 1 link curto
r = await a("/api/curtos", {
  method: "POST",
  body: JSON.stringify({ title: "Terceiro", numero: "11973933648" }),
});
checa("plano Free barra o link curto extra", r.status === 402, `status ${r.status}`);

// O slug "w" nao pode ser registrado por ninguem
r = await fetch(`${BASE}/api/slug/disponivel?slug=w`);
const slugW = await r.json();
checa("slug 'w' nao pode ser registrado", slugW.disponivel === false, slugW.erro ?? "");


// --- ENCURTADOR DE URL COMUM ------------------------------------------------

// A conta C ja existe e ainda tem cota livre (o link de codigo repetido foi
// recusado, entao nada foi gravado nela).
r = await c("/api/curtos", {
  method: "POST",
  body: JSON.stringify({
    tipo: "url",
    title: "Promocao do site",
    url: "meusite.com.br/promocao?utm_source=cartao",
  }),
});
const curtoUrl = (await r.json()).curto;
checa("encurta uma URL comum", r.ok && Boolean(curtoUrl?.code));
checa("completa o https que faltava", curtoUrl?.destino?.startsWith("https://meusite.com.br"), curtoUrl?.destino);
checa("preserva a query string", curtoUrl?.destino?.includes("utm_source=cartao"), curtoUrl?.destino);
checa("link de URL nao guarda numero", curtoUrl?.numero === null, String(curtoUrl?.numero));
checa("link de URL vem marcado como tipo url", curtoUrl?.tipo === "url", curtoUrl?.tipo);

r = await fetch(`${BASE}/w/${curtoUrl.code}`, { redirect: "manual" });
checa("URL encurtada redireciona (307)", r.status === 307, `status ${r.status}`);
checa(
  "redireciona pro endereco certo",
  (r.headers.get("location") ?? "").startsWith("https://meusite.com.br/promocao"),
  r.headers.get("location") ?? "",
);

// javascript: nao pode virar link publico
const d2 = sessao();
r = await d2("/api/auth/cadastro", {
  method: "POST",
  body: JSON.stringify({
    nome: "Quarta Conta",
    email: `d-${marca}@teste.com`,
    senha: "senha12345",
    slug: `teste-d-${marca}`,
  }),
});
checa("cadastro da conta D", r.ok);

r = await d2("/api/curtos", {
  method: "POST",
  body: JSON.stringify({ tipo: "url", title: "Ataque", url: "javascript:alert(1)" }),
});
checa("recusa javascript: como destino", r.status === 400, `status ${r.status}`);

r = await d2("/api/curtos", {
  method: "POST",
  body: JSON.stringify({ tipo: "url", title: "Torto", url: "isso nao e um endereco" }),
});
checa("recusa endereco sem dominio", r.status === 400, `status ${r.status}`);

console.log(falhas === 0 ? "\nTUDO PASSOU" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
