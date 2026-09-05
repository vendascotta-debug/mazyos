# Site Chef Churrasco

Site estático de uma página. Abre `index.html` direto no navegador — não precisa
servidor, não tem build.

## O que precisa ser preenchido antes de publicar

1. **Número do WhatsApp** — está como `SEUNUMERO` em 2 lugares no `index.html`
   (botão do contato e botão flutuante). Trocar pelo número no formato
   internacional sem símbolos: `5511999998888`.

2. **Otimizar as imagens.** A pasta `img/` está com ~38 MB porque as fotos são
   PNG em resolução cheia. Isso é pesado demais pra site — no celular via 4G
   levaria muito tempo pra carregar. Antes de publicar, passar todas por
   <https://squoosh.app> convertendo pra JPEG qualidade ~78 e largura máx 1800px.
   Deve cair pra ~2 MB no total. Depois é só trocar as extensões `.png` por `.jpg`
   no `index.html`.

## Estrutura

```
site/
  index.html      página única
  img/            todas as imagens
```

## Imagens

| Arquivo | Origem |
|---|---|
| `logo.png`, `kombi.png`, `evento-0*.jpg` | Fotos e arte reais do Chef Churrasco |
| `hamburguer.png`, `picanha.png`, `costela.png`, `espetinhos.png` | Geradas por IA em 05/09/2026 — livres de licença |

> As 4 fotos de comida são geradas, não são do produto real. Assim que houver
> foto de verdade do hambúrguer e dos cortes na Kombi, substituir — foto real
> converte mais e evita frustração de expectativa no cliente.

## Publicar

Qualquer hospedagem de site estático serve. O mais simples é arrastar a pasta
`site/` inteira em <https://app.netlify.com/drop> — sai no ar na hora, de graça.
