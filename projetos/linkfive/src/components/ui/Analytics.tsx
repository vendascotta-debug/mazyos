import Script from "next/script";

/**
 * Google Analytics, só nas páginas de venda.
 *
 * Duas decisões que valem explicar, porque as duas são deliberadas:
 *
 * 1. NÃO entra na página pública do cliente (`/[slug]`) nem no redirecionador
 *    (`/w/`). Aquelas páginas abrem no 4G do cliente do nosso cliente, e o
 *    projeto trata isso como regra. Além do peso, seria errado: as visitas à
 *    página da oficina são do dono da oficina, e ele já as vê no painel dele.
 *    Misturar tudo no nosso Analytics inflaria o nosso número com tráfego que
 *    não é nosso.
 *
 * 2. Sem `NEXT_PUBLIC_GA_ID` configurado, não carrega nada — nem o script, nem
 *    o cookie. É o mesmo desenho do botão do Google: recurso que depende de
 *    configuração externa não pode deixar entulho quando a configuração não
 *    existe.
 *
 * `afterInteractive` deixa a página desenhar primeiro. Medição não pode
 * competir com o conteúdo pela atenção do navegador.
 */
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
