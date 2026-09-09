import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Confere se o envio de e-mail está de pé, e diz o que falta quando não está.
//
//   npm run email:testar seu@email.com
//
// Existe porque a falha mais provável aqui não é bug: é configuração. Domínio
// não verificado, chave errada, remetente de um domínio que não é seu. O
// Resend responde com uma mensagem clara, e sem esse script ela ficaria
// enterrada no log da Vercel — descoberta só quando um cliente reclamasse de
// não receber o link de senha.
// ---------------------------------------------------------------------------

const raiz = path.resolve(import.meta.dirname, "..");

/** Lê o .env.local sem depender de biblioteca. */
function carregarEnv() {
  const arquivo = path.join(raiz, ".env.local");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    const chave = linha.slice(0, i).trim();
    const valor = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}

carregarEnv();

const destino = process.argv[2];
if (!destino || !destino.includes("@")) {
  console.error("Uso: npm run email:testar seu@email.com");
  process.exit(1);
}

const chave = process.env.RESEND_API_KEY?.trim();
const smtp = process.env.SMTP_HOST?.trim();
const remetente = process.env.EMAIL_REMETENTE?.trim() || "LINKFIVE <nao-responda@linkfive.com.br>";
const resposta = process.env.EMAIL_RESPOSTA?.trim();

console.log("\nCONFIGURAÇÃO");
console.log(`  remetente:  ${remetente}`);
console.log(`  resposta:   ${resposta || "(nenhuma — o cliente não consegue responder)"}`);
console.log(`  Resend:     ${chave ? `sim (${chave.slice(0, 6)}…)` : "não configurado"}`);
console.log(`  SMTP:       ${smtp || "não configurado"}`);

if (!chave && !smtp) {
  console.log(
    "\nNenhum serviço configurado. Em desenvolvimento o e-mail sai no terminal;\n" +
      "em produção ele NÃO chega ao cliente. Preencha RESEND_API_KEY ou SMTP_* no .env.local.",
  );
  process.exit(1);
}

// O domínio do remetente precisa bater com um domínio verificado na conta.
const dominio = remetente.match(/@([^>\s]+)/)?.[1];
if (dominio?.endsWith("gmail.com")) {
  console.log(
    "\nATENÇÃO: o remetente é um @gmail.com. O Gmail não autoriza outro serviço a\n" +
      "assinar em nome dele, então a mensagem vai ser recusada ou cair no spam.\n" +
      "Use um endereço do linkfive.com.br.",
  );
}

console.log(`\nEnviando para ${destino}…`);

// Importa o módulo de verdade, e não uma cópia: o Node 24 lê TypeScript
// direto. Uma segunda implementação aqui só serviria para divergir da que roda
// em produção — e aí o teste passaria enquanto o cliente não recebe nada.
const { enviarEmail, emailDeRecuperacao } = await import(
  new URL("../src/lib/email.ts", import.meta.url).href
);

const conteudo = emailDeRecuperacao(
  "Alessandro",
  `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://linkfive.com.br"}/redefinir?token=teste-de-envio`,
  30,
);

const r = await enviarEmail({ ...conteudo, para: destino, assunto: "[teste] " + conteudo.assunto });

if (r.enviado) {
  console.log(`\nENVIADO via ${r.via}. Confira a caixa de entrada e o spam de ${destino}.`);
  process.exit(0);
}

console.error(`\nFALHOU via ${r.via}:\n  ${r.erro}\n`);

// As duas recusas que realmente acontecem, traduzidas.
if (/domain is not verified|not verified/i.test(r.erro ?? "")) {
  console.error(
    `O domínio "${dominio}" ainda não está verificado no Resend.\n` +
      "No painel do Resend: Domains → Add Domain → linkfive.com.br, e cole os\n" +
      "registros que ele mostrar no DNS da Hostinger.",
  );
} else if (/testing emails|own email address/i.test(r.erro ?? "")) {
  console.error(
    "A conta ainda está no modo de teste: sem domínio verificado, o Resend só\n" +
      "deixa enviar para o e-mail dono da conta. É exatamente por isso que o\n" +
      "arranjo do QuatroCar não serve aqui — lá o destinatário é você, aqui é o cliente.",
  );
} else if (/api key|unauthorized|401/i.test(r.erro ?? "")) {
  console.error("A chave foi recusada. Confira se copiou a chave inteira (começa com re_).");
}
process.exit(1);
