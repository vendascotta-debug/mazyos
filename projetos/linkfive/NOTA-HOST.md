# Um host só: linkfive.com.br, sem `www`

**09/09/2026.** Registro de um bug que custou caro achar e que teria voltado.

## O que aconteceu

O "entrar com o Google" falhava com `google-expirado`. O registro de produção
mostrou o motivo:

    11:16:45  www.linkfive.com.br   GET /api/auth/google
    11:16:56  linkfive.com.br       GET /api/auth/google/callback

O visitante começou o login em `www.linkfive.com.br`. O cookie do `state` foi
gravado para aquele host. O Google devolveu para `linkfive.com.br`, porque é
esse o endereço de retorno registrado — e cookie de `www` não vai para o apex.
São hosts diferentes.

## Por que isso é maior que o login do Google

**O cookie de sessão tem exatamente o mesmo problema.** Quem entrasse pelo
`www` e depois abrisse um link sem `www` apareceria deslogado, sem entender por
quê. O mesmo vale para o cookie de convidado, que carrega o link encurtado até
o cadastro.

Não era um bug do OAuth. Era o site respondendo em dois endereços.

## A correção

`vercel.json` manda todo `www` para o apex, com 308. Isso acontece na camada de
roteamento da Vercel, antes de qualquer função — custo zero de execução.

Foi resolvido ali, e não no middleware, de propósito: o middleware deste projeto
faz triagem barata em três rotas, e alargar o `matcher` para o site inteiro
colocaria código no caminho da página pública, que é justamente a que precisa
abrir rápido no 4G do cliente final.

## A regra que fica

**`linkfive.com.br` é o único host.** É o que está em `NEXT_PUBLIC_SITE_URL`, é
o que vai nos QR impressos, é o endereço de retorno registrado no Google e é
para onde os links curtos apontam.

Se um dia aparecer outro host servindo a aplicação — um domínio novo, um
`app.`, um endereço de pré-visualização usado como oficial — o mesmo problema
volta, e volta calado: tudo funciona até alguém trocar de host no meio do
caminho.
