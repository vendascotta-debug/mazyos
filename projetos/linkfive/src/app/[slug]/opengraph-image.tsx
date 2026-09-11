import { ImageResponse } from "next/og";
import { paginaPublica } from "@/lib/repo";
import { tema } from "@/lib/temas";
import { iniciais as calcularIniciais } from "@/lib/iniciais";

// ---------------------------------------------------------------------------
// A capa que aparece quando alguém cola o link no WhatsApp, no Instagram ou
// no Facebook.
//
// Antes a gente mandava a logo do cliente crua, do jeito que ele subiu. Duas
// coisas quebravam: a do Cotta tem 589 KB e o WhatsApp descarta miniatura
// acima de ~300 KB (mostra o texto e desiste da figura), e uma logo quadrada
// dentro de um card 1200x630 fica espremida.
//
// Aqui a imagem é desenhada na hora, no tamanho certo e com poucos KB. De
// quebra ela leva a marca do LINKFIVE: cada link que um cliente compartilha
// é a divulgação mais barata que existe.
// ---------------------------------------------------------------------------

// O "5" da marca, o mesmo de `components/ui/Logo`, aqui como SVG embutido:
// o satori desenha `<img>` de data URI com folga, e assim a capa nao depende
// de buscar arquivo nenhum na hora de responder ao robo do WhatsApp.
//
// O degrade para no azul (o logo vai ate o azul-marinho): a capa herda o fundo
// do tema do cliente, e o marinho sumiria nos temas escuros.
const MARCA_5 = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <defs><linearGradient id="g" x1="4" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
      <stop stop-color="#38bdf8"/><stop offset="1" stop-color="#1e6bff"/>
    </linearGradient></defs>
    <path d="M9.5 5.5h13M9.5 5.5v8h6.5a6 6 0 1 1 0 12h-5" stroke="url(#g)" stroke-width="4.2"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14.6 19.6h4.4" stroke="#22d3a6" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
).toString("base64")}`;

export const alt = "Página no LINKFIVE";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A capa e pedida por robo de rede social, que nao espera — daí o cache. Mas
// cache longo demais tem custo: quem troca a logo continuaria compartilhando a
// antiga. Cinco minutos e o meio termo. (O WhatsApp guarda a dele por muito
// mais tempo; para forcar a atualizacao la, o jeito e compartilhar o endereco
// com algo depois da barra, tipo `?v=2`.)
export const revalidate = 300;

export default async function Capa({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await paginaPublica(slug);

  const t = tema(page?.themeId);
  const titulo = page?.title || slug;
  const bio = page?.bio ?? "";
  const avatar = page?.avatarUrl ?? null;

  // `fundo` aceita gradiente — separar os dois casos evita um card preto
  // quando o tema usa linear-gradient.
  const fundo = t.vars.fundo.includes("gradient")
    ? { backgroundImage: t.vars.fundo }
    : { backgroundColor: t.vars.fundo };

  return new ImageResponse(
    (
      <div
        style={{
          ...fundo,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 190,
            height: 190,
            borderRadius: "50%",
            backgroundColor: t.vars.cardFundo,
            border: `6px solid ${t.vars.cardBorda}`,
            overflow: "hidden",
          }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" width={190} height={190} style={{ objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 72, fontWeight: 700, color: t.vars.texto }}>
              {calcularIniciais(titulo)}
            </span>
          )}
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 62,
            fontWeight: 700,
            color: t.vars.texto,
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          {titulo}
        </div>

        {bio ? (
          <div
            style={{
              marginTop: 18,
              fontSize: 28,
              color: t.vars.textoSuave,
              textAlign: "center",
              lineHeight: 1.35,
              // Bio longa empurraria a marca pra fora do card.
              display: "flex",
              overflow: "hidden",
              maxWidth: 900,
              maxHeight: 80,
            }}
          >
            {bio.length > 110 ? `${bio.slice(0, 110).trimEnd()}…` : bio}
          </div>
        ) : null}

        {/* A assinatura. Vai em toda pagina, inclusive das pagantes: cada link
            compartilhado por um cliente e a divulgacao mais barata que existe.
            Decisao do Alessandro em 11/09/2026. */}
        <div
          style={{
            marginTop: 42,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 26px",
            borderRadius: 999,
            backgroundColor: t.vars.cardFundo,
            border: `2px solid ${t.vars.cardBorda}`,
          }}
        >
          {/* O simbolo ganha fundo branco proprio: no tema de degrade azul ele
              se perdia contra o fundo, e a marca lavada nao serve de marca. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: "#ffffff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARCA_5} alt="" width={26} height={26} />
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: t.vars.texto }}>
            {`linkfive.com.br/${slug}`}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
