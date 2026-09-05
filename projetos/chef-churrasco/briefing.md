# Briefing — Chef Churrasco

**Data:** 05/09/2026
**Tipo:** Iniciativa pessoal
**Quem toca:** Alessandro (operação e marca são dele)

## O negócio

Food truck de churrasco com hambúrguer artesanal. Negócio novo, em fase de
estruturação.

## Objetivo

Criar e colocar de pé o Chef Churrasco como negócio de rua: a Kombi estaciona em
condomínio ou em via pública, o cliente conhece a marca, chega e come **no local**.

**Como fatura:** venda direta dos lanches na Kombi, no ponto. Não é catering por
pessoa, não é pacote fechado de evento.

## O que o site NÃO é

Decidido em 05/09/2026. Não mudar sem o Alessandro pedir:

- **Sem preço.** Cardápio sim, tabela de preço não
- **Sem pedido online, sem carrinho, sem integração de delivery**
- Não é loja. É cartão de visita: apresenta a marca, mostra a comida, diz onde a
  Kombi está e como falar com o chef

O papel do site é fazer a pessoa **querer procurar a Kombi** e saber onde achar.

## Entregas previstas

### Site
Página com informações do negócio. Serve pra:
- Apresentar o Chef Churrasco pra síndicos e moradores interessados em contratar evento
- Dar credibilidade e ponto de referência pros canais de delivery
- Concentrar contato (WhatsApp / formulário de orçamento)

### Conteúdo / Instagram
- Perfil `@chefchurrasco` já existe, pouco utilizado
- Precisa de reativação: linha editorial, frequência, tipo de post

## Identidade visual

A marca já está bem mais construída do que parecia no primeiro turno.

- **Logo:** circular, anel vermelho (#B42125) com borda creme, mascote de chef com
  chapéu branco, faca e garfo, sobre raios (sunburst). Arquivo em 2000px, fundo
  transparente.
- **Food truck:** Kombi envelopada, base **preta** com vermelho, chamas e foto de
  carne em close. Logo aplicado nos dois lados.
- **Mensagens já no carro:** "Churrasco na brasa", "Bons cortes, grandes
  histórias", "Carne boa reúne pessoas", "Qualidade, sabor, tradição em cada corte".
- **Cardápio declarado:** picanha, costela, linguiça, espetinhos, hambúrguer.
- **A marca tem rosto:** o Alessandro aparece no envelopamento (boné e dólmã pretos).

> Paleta completa, regras de aplicação e tom visual em `identidade/design-guide.md`.

## Pendências / a definir

- [ ] Nome jurídico, CNPJ e MEI
- [ ] Região de atuação (quais bairros / cidade)
- [ ] Cardápio e faixa de preço (churrasco por evento vs. hambúrguer delivery)
- [ ] Modelo de cobrança pra evento em condomínio (por pessoa? pacote?)
- [ ] Cadastro nas plataformas de delivery
- [x] ~~Arquivo do logo em alta em `identidade/`~~ — recebido
- [ ] Fotos de produto: hambúrguer artesanal e cortes prontos (as atuais são de operação e da Kombi)
- [ ] Fontes usadas no envelopamento (pedir os arquivos com quem fez o wrap)

---

# Onde paramos — 05/09/2026

## Feito

- Pasta do projeto criada com `CLAUDE.md` próprio
- Identidade registrada em `identidade/design-guide.md` — paleta amostrada dos
  pixels do logo e do envelopamento (vermelho `#B42125`, creme `#FDEBBC`, preto base)
- Site de uma página pronto em `site/index.html`
- **No ar:** <https://chef-churrasco.vercel.app> (projeto Vercel `chef-churrasco`,
  conta `vendascotta-2685`). Publicado com `noindex` — link funciona pra
  apresentar, mas o Google não indexa ainda
- Lightbox: 13 fotos abrem ampliadas com setas, ESC e swipe no celular

## Imagens

| Origem | Arquivos |
|---|---|
| Reais do negócio | `logo`, `kombi`, `evento-01/02/03` |
| Artes da marca (mockups) | `kombi-parque`, `kombi-clientes`, `kombi-servindo` |
| Geradas por IA em 05/09 | `hamburguer`, `picanha`, `costela`, `espetinhos` |

## Pendências pra próxima sessão

**Bloqueiam a publicação de verdade:**

- [ ] **WhatsApp** — está como `SEUNUMERO` em 2 lugares no `index.html`.
      Formato: `5511999998888`
- [ ] **Cidade / região de atuação** — o site não diz onde a Kombi roda.
      É o primeiro filtro de quem acha no Google
- [ ] **Peso das imagens** — `site/img/` tem ~45 MB em PNG. Pesado demais pra
      celular no 4G, e o lightbox carrega em tamanho cheio. Converter pra JPEG
      (~78 de qualidade, máx 1800px). Não há compressor instalado na máquina

**Depois:**

- [ ] Tirar o `noindex` (`vercel.json` + `robots.txt`) quando o site estiver completo
- [ ] Foto real do hambúrguer e dos cortes, pra substituir as geradas por IA
- [ ] Erros de escrita nas artes: "HAMBÚRGUEER" e "HAMBÜRGUER" (com trema)
      aparecem nos painéis das imagens da Kombi, e os ícones do cardápio estão
      trocados. Corrigir antes de virar envelopamento impresso
- [ ] Instagram `@chefchurrasco` — reativar: linha editorial e frequência
- [ ] CNPJ / MEI

## Decisões travadas (não mudar sem o Alessandro pedir)

- Sem preço no site
- Sem pedido online, sem carrinho, sem delivery
- Fundo preto é a base da marca; vermelho é acento
- Não inventar tagline nova — usar as que já estão no carro
