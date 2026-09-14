import { FAQ } from "@/lib/faq";
import { FAQ_WHATSAPP } from "@/lib/faq-whatsapp";
import { FAQ_PRECOS } from "@/lib/faq-precos";
import { ORDEM_PLANOS, PLANOS } from "@/lib/limites";
import { SITE, SITE_URL, abs } from "@/lib/seo";

/**
 * Dados estruturados (schema.org) em JSON-LD.
 *
 * Por que isto existe: a landing já tem FAQ, preço e descrição de produto
 * escritos para gente. O JSON-LD é a mesma informação escrita para máquina —
 * é o que permite ao Google mostrar as perguntas abertas no resultado e
 * entender que aqui existe um produto com preço em real, e não só um texto.
 *
 * Regra que não pode ser quebrada: **tudo o que está aqui precisa estar
 * visível na página**. Preço que só existe no schema, ou resposta de FAQ que
 * o visitante não consegue ler, é motivo de ação manual — perde-se mais do
 * que se ganha.
 */

function Bloco({ dados }: { dados: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify já escapa aspas; o replace do "<" evita que um texto
      // com "</script>" feche a tag antes da hora.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }}
    />
  );
}

/** Layout — vale para o site inteiro. */
export function OrganizacaoJsonLd() {
  return (
    <>
      <Bloco
        dados={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${SITE_URL}/#organizacao`,
          name: SITE.nome,
          legalName: SITE.razaoSocial,
          taxID: SITE.cnpj,
          url: SITE_URL,
          image: abs(SITE.ogImage),
          email: SITE.emailResposta,
          areaServed: "BR",
        }}
      />
      <Bloco
        dados={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${SITE_URL}/#site`,
          url: SITE_URL,
          name: SITE.nome,
          inLanguage: "pt-BR",
          publisher: { "@id": `${SITE_URL}/#organizacao` },
        }}
      />
    </>
  );
}

/**
 * O produto: UMA entidade, com UM @id, para o site inteiro.
 *
 * Antes havia duas — um SoftwareApplication na home e um Product na /precos —
 * descrevendo o mesmo LINKFIVE com @id diferentes e conjuntos de preço
 * diferentes (a home só com o anual; a /precos com mensal e anual). Para quem
 * lê o schema, eram dois produtos que discordavam sobre quanto custam.
 *
 * Agora as duas páginas publicam exatamente o mesmo objeto, montado aqui, a
 * partir de PLANOS. Preço escrito à mão viraria mentira no dia em que a tabela
 * mudar — e preço errado no schema é pior do que schema nenhum.
 */
const ID_PRODUTO = `${SITE_URL}/#produto`;

/** UN/CEFACT: MON = mês, ANN = ano. */
function especificacao(centavos: number, unidade: "MON" | "ANN") {
  return {
    "@type": "UnitPriceSpecification",
    price: (centavos / 100).toFixed(2),
    priceCurrency: "BRL",
    billingDuration: 1,
    billingIncrement: 1,
    unitCode: unidade,
  };
}

function ofertasDosPlanos() {
  // A tabela de preços mora na /precos; é para lá que a oferta aponta, nas duas
  // páginas — o objeto tem de ser idêntico onde quer que apareça.
  const url = `${SITE_URL}/precos`;

  return (
    ORDEM_PLANOS
      // Plano oculto não aparece na tabela; no schema também não pode aparecer,
      // senão o Google anuncia um preço que a página não mostra.
      .filter((id) => !PLANOS[id].oculto)
      .flatMap((id) => {
        const plano = PLANOS[id];
        const base = {
          "@type": "Offer",
          name: `${SITE.nome} ${plano.nome}`,
          priceCurrency: "BRL",
          url,
          availability: "https://schema.org/InStock",
        };

        // O gratuito não tem ciclo de cobrança: declarar assinatura nele seria
        // afirmar algo que a página não diz.
        if (plano.precoCents === 0 && plano.precoAnualCents === null) {
          return [{ ...base, price: "0.00" }];
        }

        // `price` e `priceCurrency` ficam também no nível do Offer: nem todo
        // leitor desce até o priceSpecification, e sem eles a oferta fica sem
        // preço. O priceSpecification é o que diz que é recorrente e com que
        // período — sem ele, "97.00" parece pagamento único.
        const ofertas = [
          {
            ...base,
            name: `${base.name} (mensal)`,
            price: (plano.precoCents / 100).toFixed(2),
            category: "subscription",
            priceSpecification: especificacao(plano.precoCents, "MON"),
          },
        ];

        if (plano.precoAnualCents !== null) {
          ofertas.push({
            ...base,
            name: `${base.name} (anual)`,
            price: (plano.precoAnualCents / 100).toFixed(2),
            category: "subscription",
            priceSpecification: especificacao(plano.precoAnualCents, "ANN"),
          });
        }
        return ofertas;
      })
  );
}

function entidadeProduto() {
  const ofertas = ofertasDosPlanos();
  const precos = ofertas.map((o) => Number(o.price));

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": ID_PRODUTO,
    name: SITE.nome,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    image: abs(SITE.ogImage),
    inLanguage: "pt-BR",
    description:
      "Página de links com botão de WhatsApp com mensagem pronta, formulário de captura de leads, links diretos, QR Code e métricas de cliques.",
    publisher: { "@id": `${SITE_URL}/#organizacao` },
    featureList: [
      "Página de links (link na bio)",
      "Botão de WhatsApp com mensagem pronta",
      "Link direto e encurtador com QR Code",
      "Formulário de captura de leads",
      "Painel de leads exportável",
      "Métricas de visitas e cliques",
      "Catálogo em PDF",
    ],
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      // Mínimo e máximo calculados das próprias ofertas, e offerCount é o
      // tamanho do array — nada disso pode ser escrito à mão e divergir.
      lowPrice: Math.min(...precos).toFixed(2),
      highPrice: Math.max(...precos).toFixed(2),
      offerCount: ofertas.length,
      offers: ofertas,
    },
  };
}

/** Home — o produto e os planos. */
export function ProdutoJsonLd() {
  return <Bloco dados={entidadeProduto()} />;
}

/** Home — as perguntas frequentes. Lê o MESMO array que o acordeão. */
export function FaqJsonLd() {
  return (
    <Bloco
      dados={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.p,
          acceptedAnswer: { "@type": "Answer", text: f.r },
        })),
      }}
    />
  );
}

/**
 * Pagina /gerador-de-link-whatsapp.
 *
 * Nao espere resultado enriquecido do FAQPage: o Google encerrou os rich
 * results de FAQ em 07/05/2026 e tirou o relatorio do Search Console em
 * junho. O bloco fica por outro motivo — o Google continua lendo o markup
 * para entender a pagina, e AI Overviews, ChatGPT e Perplexity extraem
 * resposta de conteudo estruturado. Custa nada e nao some do HTML.
 */
export function FerramentaWhatsAppJsonLd() {
  const url = `${SITE_URL}/gerador-de-link-whatsapp`;

  return (
    <>
      <Bloco
        dados={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "@id": `${url}#ferramenta`,
          name: "Gerador de Link do WhatsApp",
          url,
          applicationCategory: "UtilitiesApplication",
          operatingSystem: "Web",
          inLanguage: "pt-BR",
          browserRequirements: "Requer JavaScript",
          description:
            "Cria o link que abre a conversa no WhatsApp com a mensagem ja digitada, com QR Code e link curto proprio. Sem cadastro.",
          publisher: { "@id": `${SITE_URL}/#organizacao` },
          isPartOf: { "@id": `${SITE_URL}/#site` },
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
          },
        }}
      />
      <Bloco
        dados={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "Gerador de link do WhatsApp",
              item: url,
            },
          ],
        }}
      />
      <Bloco
        dados={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          mainEntity: FAQ_WHATSAPP.map((f) => ({
            "@type": "Question",
            name: f.p,
            acceptedAnswer: { "@type": "Answer", text: f.r },
          })),
        }}
      />
    </>
  );
}

/**
 * Pagina /precos.
 *
 * Publica a MESMA entidade da home (mesmo @id, mesmo @type, mesmas ofertas).
 * O que é próprio desta página é só a trilha de navegação e o FAQ de preços.
 */
export function PrecosJsonLd() {
  const url = `${SITE_URL}/precos`;

  return (
    <>
      <Bloco dados={entidadeProduto()} />
      <Bloco
        dados={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Preços", item: url },
          ],
        }}
      />
      <Bloco
        dados={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          mainEntity: FAQ_PRECOS.map((f) => ({
            "@type": "Question",
            name: f.p,
            acceptedAnswer: { "@type": "Answer", text: f.r },
          })),
        }}
      />
    </>
  );
}
