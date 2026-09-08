// ---------------------------------------------------------------------------
// Envio de e-mail.
//
// Uma função só, com três caminhos, escolhidos pelo que estiver configurado:
//
//   RESEND_API_KEY  → Resend, por HTTP. É o caminho recomendado, e não traz
//                     dependência nenhuma: a API é um POST com JSON.
//   SMTP_*          → qualquer servidor SMTP (inclusive o do Gmail). Só liga
//                     se o `nodemailer` estiver instalado.
//   nada            → o e-mail vai para o terminal, em desenvolvimento.
//
// O último caminho não é preguiça: sem ele, mexer na recuperação de senha
// exigiria uma chave de produção na máquina de desenvolvimento, e o teste
// ponta a ponta não teria como conferir o link que o cliente recebe.
//
// SOBRE O REMETENTE: ele precisa ser um endereço do linkfive.com.br, com o
// domínio verificado. E-mail automático saindo de @gmail.com para o cliente é
// barrado ou vai para spam — o Gmail não autoriza outro serviço a assinar em
// nome dele, e o DMARC do gmail.com é de rejeição.
// ---------------------------------------------------------------------------

export interface Email {
  para: string;
  assunto: string;
  html: string;
  /** Versão em texto puro. Nem todo cliente de e-mail mostra HTML. */
  texto: string;
}

function remetente(): string {
  return process.env.EMAIL_REMETENTE?.trim() || "LINKFIVE <nao-responda@linkfive.com.br>";
}

/**
 * Manda o e-mail. Devolve como ele saiu — quem chama decide o que fazer.
 *
 * Nunca lança: uma falha de e-mail não pode derrubar a requisição que o
 * cliente está fazendo. Quem chama recebe `enviado: false` e trata.
 */
export async function enviarEmail(
  email: Email,
): Promise<{ enviado: boolean; via: "resend" | "smtp" | "terminal"; erro?: string }> {
  const chaveResend = process.env.RESEND_API_KEY?.trim();

  if (chaveResend) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${chaveResend}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: remetente(),
          to: [email.para],
          subject: email.assunto,
          html: email.html,
          text: email.texto,
        }),
      });

      if (!r.ok) {
        const detalhe = await r.text().catch(() => "");
        return { enviado: false, via: "resend", erro: `${r.status} ${detalhe.slice(0, 300)}` };
      }
      return { enviado: true, via: "resend" };
    } catch (e) {
      return { enviado: false, via: "resend", erro: String(e) };
    }
  }

  if (process.env.SMTP_HOST?.trim()) {
    try {
      // Import dinâmico: o nodemailer só é exigido de quem escolheu SMTP. Quem
      // usa Resend não precisa ter o pacote instalado.
      const { createTransport } = await import("nodemailer");
      const transporte = createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporte.sendMail({
        from: remetente(),
        to: email.para,
        subject: email.assunto,
        html: email.html,
        text: email.texto,
      });
      return { enviado: true, via: "smtp" };
    } catch (e) {
      return { enviado: false, via: "smtp", erro: String(e) };
    }
  }

  console.log(
    `\n─── E-MAIL (nenhum serviço configurado) ───\npara: ${email.para}\nassunto: ${email.assunto}\n\n${email.texto}\n───────────────────────────────────────────\n`,
  );
  return { enviado: true, via: "terminal" };
}

/** Há um serviço de e-mail de verdade configurado? */
export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim());
}

/**
 * O e-mail de redefinição de senha.
 *
 * Sem imagem e sem CSS externo: cliente de e-mail bloqueia imagem por padrão, e
 * uma mensagem que chega quebrada num momento de aflição ("perdi minha conta")
 * é pior que uma mensagem simples. O endereço aparece escrito por extenso
 * porque muita gente foi ensinada, com razão, a não clicar em botão de e-mail.
 */
export function emailDeRecuperacao(nome: string, link: string, minutos: number): Email {
  const texto = [
    `Olá, ${nome}.`,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta LINKFIVE.",
    "",
    `Abra este endereço para escolher uma senha nova (vale por ${minutos} minutos):`,
    link,
    "",
    "Se não foi você que pediu, ignore esta mensagem — sua senha continua a mesma.",
    "",
    "LINKFIVE — linkfive.com.br",
  ].join("\n");

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0a1428">
  <p style="font-size:20px;font-weight:700;margin:0 0 24px">LINK<span style="color:#1e6bff">FIVE</span></p>
  <p style="font-size:16px;margin:0 0 16px">Olá, ${nome}.</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 20px">Recebemos um pedido para redefinir a senha da sua conta. Clique no botão para escolher uma senha nova — ele vale por ${minutos} minutos.</p>
  <p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;background:#1e6bff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;font-weight:600">Criar senha nova</a></p>
  <p style="font-size:13px;line-height:1.6;color:#5b6b85;margin:0 0 20px">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="color:#1e6bff;word-break:break-all">${link}</span></p>
  <p style="font-size:13px;line-height:1.6;color:#5b6b85;margin:0;border-top:1px solid #e2e8f0;padding-top:16px">Se não foi você que pediu, pode ignorar esta mensagem — sua senha continua a mesma.</p>
</div>`;

  return { para: "", assunto: "Redefinir sua senha do LINKFIVE", html, texto };
}
