import fs from "node:fs";

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
checa("links na pagina sao ilimitados no Free", r.ok, `status ${r.status}`);

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

// O Free agora deixa criar varios links curtos (10.000 ativos, 100/mes).
r = await a("/api/curtos", {
  method: "POST",
  body: JSON.stringify({ title: "Segundo", numero: "11973933648" }),
});
checa("Free permite mais de um link curto", r.ok, `status ${r.status}`);

// A cota em si e testada direto no modulo, logo abaixo: subir 100 links por
// HTTP so para ver o 101 ser barrado levaria minutos e testaria a mesma conta.
const limites = await import("../src/lib/limites.ts");

const cotaCheia = limites.podeCriarCurto("free", 0, limites.PLANOS.free.maxCurtosMes);
checa(
  "cota mensal barra quando enche",
  cotaCheia.permitido === false && cotaCheia.motivo.includes("por mês"),
  cotaCheia.motivo ?? "",
);

const tetoAtivos = limites.podeCriarCurto("free", limites.PLANOS.free.maxCurtos, 0);
checa(
  "teto de ativos barra quando enche",
  tetoAtivos.permitido === false && tetoAtivos.motivo.includes("ativos"),
  tetoAtivos.motivo ?? "",
);

checa("dentro dos dois tetos, permite", limites.podeCriarCurto("free", 5, 5).permitido === true);

checa(
  "plano pago nao tem cota mensal",
  limites.podeCriarCurto("pro", 999999, 999999).permitido === true,
);

// Conta antiga gravada como "business" nao pode virar Free e perder recurso.
checa(
  "plano legado business vira Pro",
  limites.plano("business").id === "pro",
  limites.plano("business").id,
);

checa(
  "anual do Starter desconta",
  (limites.descontoAnual(limites.PLANOS.starter) ?? 0) >= 10,
  `${limites.descontoAnual(limites.PLANOS.starter)}%`,
);

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


// --- PAINEL ADMINISTRATIVO --------------------------------------------------

// Cliente comum nao entra no painel nem chama a rota de acao.
r = await fetch(`${BASE}/admin`, {
  redirect: "manual",
  headers: { cookie: "" },
});
checa("visitante sem sessao nao abre /admin", r.status === 307 || r.status === 302, `status ${r.status}`);

r = await a(`/api/admin/cliente/${infoB.pageId ? "qualquer" : "qualquer"}`, {
  method: "PATCH",
  body: JSON.stringify({ plano: "pro" }),
});
checa("cliente comum nao usa a rota de admin", r.status === 404, `status ${r.status}`);

// Promove a conta A a admin direto no banco, como o ADMIN_EMAILS faria.
const { createRequire } = await import("node:module");
const requireLocal = createRequire("C:/Users/User/MazyOS/projetos/linkfive/package.json");
const postgres = requireLocal("postgres");
const envTxt = fs.readFileSync("C:/Users/User/MazyOS/projetos/linkfive/.env.local", "utf8");
const envMap = Object.fromEntries(
  envTxt
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const conn = new URL(envMap.DATABASE_URL);
conn.searchParams.delete("channel_binding");
const sqlDireto = postgres(conn.toString(), { prepare: false, ssl: "require", onnotice: () => {} });
const esquema = envMap.DB_SCHEMA || "public";

const [contaA] = await sqlDireto.unsafe(
  `SELECT id FROM ${esquema}.users WHERE email = $1`,
  [`a-${marca}@teste.com`],
);
await sqlDireto.unsafe(`UPDATE ${esquema}.users SET role = 'admin' WHERE id = $1`, [contaA.id]);

// Agora A e admin: o painel abre e as acoes funcionam.
const [contaB] = await sqlDireto.unsafe(
  `SELECT id FROM ${esquema}.users WHERE email = $1`,
  [`b-${marca}@teste.com`],
);

r = await a(`/api/admin/cliente/${contaB.id}`, {
  method: "PATCH",
  body: JSON.stringify({ plano: "cortesia" }),
});
checa("admin concede o plano Cortesia", r.ok, `status ${r.status}`);

const [depoisPlano] = await sqlDireto.unsafe(
  `SELECT plan FROM ${esquema}.users WHERE id = $1`,
  [contaB.id],
);
checa("o Cortesia foi gravado", depoisPlano.plan === "cortesia", depoisPlano.plan);

// Cortesia libera o que o Free barrava: B agora cria varios links curtos.
for (let i = 0; i < 3; i++) {
  await b("/api/curtos", {
    method: "POST",
    body: JSON.stringify({ tipo: "whatsapp", title: `Cortesia ${i}`, numero: "11988887777" }),
  });
}
r = await b("/api/curtos");
const curtosB = (await r.json()).curtos;
checa("Cortesia libera o limite de links curtos", curtosB.length >= 3, `${curtosB.length} links`);

// Plano invalido e recusado.
r = await a(`/api/admin/cliente/${contaB.id}`, {
  method: "PATCH",
  body: JSON.stringify({ plano: "plano-inventado" }),
});
checa("plano inexistente e recusado", r.status === 400, `status ${r.status}`);

// Admin nao tira o proprio acesso.
r = await a(`/api/admin/cliente/${contaA.id}`, {
  method: "PATCH",
  body: JSON.stringify({ papel: "user" }),
});
checa("admin nao remove o proprio acesso", r.status === 400, `status ${r.status}`);

// Suspender pagina tira ela do ar na hora.
r = await a(`/api/admin/cliente/${contaA.id}`, {
  method: "PATCH",
  body: JSON.stringify({ suspender: true }),
});
checa("admin suspende a pagina", r.ok, `status ${r.status}`);

r = await fetch(`${BASE}/${slugA}`, { redirect: "manual" });
checa("pagina suspensa sai do ar", r.status === 404, `status ${r.status}`);

r = await a(`/api/admin/cliente/${contaA.id}`, {
  method: "PATCH",
  body: JSON.stringify({ suspender: false }),
});
r = await fetch(`${BASE}/${slugA}`);
checa("pagina reativada volta ao ar", r.status === 200, `status ${r.status}`);

await sqlDireto.end();


// Conexao propria para os testes de cobranca (a do bloco de admin ja foi fechada).
const requireLocal2 = (await import("node:module")).createRequire(
  "C:/Users/User/MazyOS/projetos/linkfive/package.json",
);
const postgres2 = requireLocal2("postgres");
const envMapTeste = Object.fromEntries(
  fs
    .readFileSync("C:/Users/User/MazyOS/projetos/linkfive/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const connTeste = new URL(envMapTeste.DATABASE_URL);
connTeste.searchParams.delete("channel_binding");
const sqlDireto2 = postgres2(connTeste.toString(), {
  prepare: false,
  ssl: "require",
  onnotice: () => {},
});
const esquemaTeste = envMapTeste.DB_SCHEMA || "public";


// --- FORMULARIO DE LEADS ----------------------------------------------------

// A conta B esta no Cortesia (concedida no teste do admin), entao tem
// formularios liberados. Publica a pagina dela e adiciona o bloco.
const infoB2 = await (await b("/api/pagina")).json();
await b("/api/pagina/publicar", {
  method: "POST",
  body: JSON.stringify({ pageId: infoB2.pageId, publicar: true }),
});

r = await b("/api/links", {
  method: "POST",
  body: JSON.stringify({
    pageId: infoB2.pageId,
    type: "form",
    title: "Quero receber informações",
    config: { campos: ["name", "whatsapp", "email"], formTitulo: "Fale com a gente" },
  }),
});
const blocoForm = (await r.json()).link;
checa("cria o bloco de formulario", r.ok && blocoForm?.type === "form");

// Visitante envia o formulario.
r = await fetch(`${BASE}/api/leads`, {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone)" },
  body: JSON.stringify({
    slug: slugB,
    linkId: blocoForm.id,
    name: "Maria Cliente",
    whatsapp: "11988887777",
    email: "maria@exemplo.com",
  }),
});
checa("visitante envia o formulario", r.ok, `status ${r.status}`);

// O lead chegou pro dono?
r = await b("/api/pagina");
const totaisB = (await r.json()).totais;
checa("o lead foi contado no painel", totaisB.leads >= 1, `leads=${totaisB.leads}`);

// Sem contato nenhum o lead e recusado.
r = await fetch(`${BASE}/api/leads`, {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone)" },
  body: JSON.stringify({ slug: slugB, linkId: blocoForm.id, name: "Sem Contato" }),
});
checa("lead sem contato e recusado", r.status === 400, `status ${r.status}`);

// Bloco de outra pagina nao grava lead na conta errada.
r = await fetch(`${BASE}/api/leads`, {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone)" },
  body: JSON.stringify({
    slug: slugA,
    linkId: blocoForm.id,
    name: "Invasor",
    whatsapp: "11999999999",
  }),
});
checa("bloco de outra pagina e recusado", r.status === 404, `status ${r.status}`);

// Pagina publica mostra o formulario.
r = await fetch(`${BASE}/${slugB}`);
const htmlB = await r.text();
checa("formulario aparece na pagina publica", htmlB.includes("Fale com a gente"));

// --- COBRANCA (webhook do Lastlink) -----------------------------------------

// Sem token nao passa.
r = await fetch(`${BASE}/api/webhooks/lastlink`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ event: "purchase_approved", email: "x@y.com" }),
});
checa("webhook sem token e recusado", r.status === 401 || r.status === 503, `status ${r.status}`);

// Com token certo, evento de compra libera o plano.
const tokenWebhook = envMapTeste.LASTLINK_WEBHOOK_SECRET;
// Só dá para testar a liberação de plano se o ambiente alvo tiver o mapeamento
// de produtos configurado. Em producao ele so existe depois que os produtos
// forem criados no Lastlink — ate la, isto aqui e pulado, nao reprovado.
const cfgWebhook = await fetch(`${BASE}/api/webhooks/lastlink`)
  .then((res) => res.json())
  .catch(() => ({}));

if (!cfgWebhook.produtosMapeados) {
  console.log(`[PULADO] cobranca — LASTLINK_PRODUTOS nao configurado em ${BASE}`);
}

if (tokenWebhook && cfgWebhook.produtosMapeados) {
  const emailCompra = `comprador-${marca}@teste.com`;

  r = await fetch(`${BASE}/api/webhooks/lastlink`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-lastlink-token": tokenWebhook },
    body: JSON.stringify({
      Event: "Purchase_Order_Confirmed",
      Data: {
        Buyer: { Email: emailCompra, Name: "Comprador Teste" },
        Products: [{ Id: "prod-teste-pro" }],
        Id: "pedido-123",
      },
    }),
  });
  const respWebhook = await r.json();
  checa("webhook aceita o token certo", r.ok, `status ${r.status}`);
  checa(
    "webhook encontra o e-mail aninhado no payload",
    respWebhook.acao === "concedido" || (respWebhook.aviso ?? "").includes("produto"),
    JSON.stringify(respWebhook).slice(0, 120),
  );

  // Quem paga ANTES de ter conta recebe o plano ao se cadastrar.
  const e2 = sessao();
  r = await e2("/api/auth/cadastro", {
    method: "POST",
    body: JSON.stringify({
      nome: "Comprador Teste",
      email: emailCompra,
      senha: "senha12345",
      slug: `comprador-${marca}`,
    }),
  });
  const respCadastro = await r.json();
  checa("cadastro de quem ja tinha pago funciona", r.ok, `status ${r.status}`);
  checa(
    "plano comprado antes do cadastro e aplicado",
    respCadastro.plano === "pro",
    `plano=${respCadastro.plano}`,
  );

  // Cancelamento devolve pro Free.
  r = await fetch(`${BASE}/api/webhooks/lastlink`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-lastlink-token": tokenWebhook },
    body: JSON.stringify({
      Event: "Subscription_Canceled",
      Data: { Buyer: { Email: emailCompra }, Id: "pedido-123" },
    }),
  });
  checa("webhook aceita cancelamento", r.ok, `status ${r.status}`);

  r = await e2("/api/pagina");
  // O plano nao vem nessa rota; conferimos pelo banco.
  const [depoisCancelar] = await sqlDireto2.unsafe(
    `SELECT plan FROM ${esquemaTeste}.users WHERE email = $1`,
    [emailCompra],
  );
  checa(
    "cancelamento devolve a conta ao Free",
    depoisCancelar?.plan === "free",
    `plano=${depoisCancelar?.plan}`,
  );
  await sqlDireto2.end();
}

console.log(falhas === 0 ? "\nTUDO PASSOU" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
