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
 * Home — o produto e os planos.
 *
 * Os preços saem de PLANOS pela mesma razão que as respostas do FAQ saem de
 * lá: preço escrito à mão aqui viraria mentira no dia em que a tabela mudar,
 * e preço errado no schema é pior do que schema nenhum.
 */
export function ProdutoJsonLd() {
  const ofertas = ORDEM_PLANOS
    // Plano oculto não aparece na tabela de preços; no schema também não pode
    // aparecer, senão o Google anuncia um preço que a página não mostra.
    .filter((id) => !PLANOS[id].oculto)
    .map((id) => {
      const plano = PLANOS[id];
      // Os valores ficam em centavos no código; o schema quer reais.
      // O preço anunciado é o anual, que é o que a tabela destaca.
      const centavos = plano.precoAnualCents ?? plano.precoCents;
      return {
        "@type": "Offer",
        name: plano.nome,
        price: (centavos / 100).toFixed(2),
        priceCurrency: "BRL",
        url: `${SITE_URL}/#planos`,
        availability: "https://schema.org/InStock",
      };
    });

  return (
    <Bloco
      dados={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#produto`,
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
        offers: ofertas,
      }}
    />
  );
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
 * O `Product` com `offers` e o que faz o Google entender preco em real,
 * ciclo e disponibilidade — e e o que alimenta resposta de IA sobre "quanto
 * custa o LINKFIVE". Os valores saem de PLANOS: preco no schema divergindo do
 * preco na tela e motivo de acao manual.
 */
export function PrecosJsonLd() {
  const url = `${SITE_URL}/precos`;

  const ofertas = ORDEM_PLANOS.filter((id) => !PLANOS[id].oculto).flatMap((id) => {
    const plano = PLANOS[id];
    const base = {
      "@type": "Offer" as const,
      name: `${SITE.nome} ${plano.nome}`,
      priceCurrency: "BRL",
      url,
      availability: "https://schema.org/InStock",
    };
    // O gratuito tem um preco so. Os pagos tem dois ciclos, e a pagina mostra
    // os dois — entao o schema tambem mostra.
    if (plano.precoAnualCents === null) {
      return [{ ...base, price: (plano.precoCents / 100).toFixed(2) }];
    }
    return [
      {
        ...base,
        name: `${base.name} (mensal)`,
        price: (plano.precoCents / 100).toFixed(2),
      },
      {
        ...base,
        name: `${base.name} (anual)`,
        price: (plano.precoAnualCents / 100).toFixed(2),
      },
    ];
  });

  return (
    <>
      <Bloco
        dados={{
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${url}#produto`,
          name: SITE.nome,
          description:
            "Pagina de links com botao de WhatsApp, captura de leads, links diretos, QR Code e metricas.",
          image: abs(SITE.ogImage),
          brand: { "@id": `${SITE_URL}/#organizacao` },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BRL",
            lowPrice: "0",
            highPrice: (PLANOS.pro.precoAnualCents! / 100).toFixed(2),
            offerCount: ofertas.length,
            offers: ofertas,
          },
        }}
      />
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
