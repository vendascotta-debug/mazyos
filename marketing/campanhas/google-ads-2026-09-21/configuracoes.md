# Configurações — LinkFive Search Brasil

Campanha montada em 21/09/2026. **Nasce pausada.** Só ative depois de fechar o checklist de conversão no fim deste arquivo.

## Campanha

| Item | Valor | Por quê |
|---|---|---|
| Tipo | Pesquisa (Search) | Plano aprovado em `_memoria/estrategia.md` |
| Rede | Só Google Pesquisa. **Desmarcar** parceiros de pesquisa e Display | Com R$ 20/dia, cada real fora da Pesquisa é tráfego menos qualificado |
| Orçamento | R$ 20,00/dia | Plano aprovado |
| Lance | Maximizar conversões, **sem** tCPA | Migrar para tCPA só com 30+ conversões |
| Local | Brasil, opção "Presença" (pessoas *em* ou que *frequentam* o local — não "interesse") | SaaS nacional |
| Idioma | Português | |
| Dispositivos | Celular +0%, computador +0%, tablet -20% | Padrão da skill |
| Programação | Todos os dias, o dia todo | Sem dado para restringir. Rever com 2-3 semanas de dados |
| Rotação de anúncios | Otimizar | RSA precisa disso |
| Sufixo de URL final | Já vai no CSV (utm_source/medium/campaign/term) | Ver nota abaixo |

## Estrutura

5 grupos, 65 palavras-chave (Frase + Exata), 106 negativas (global + por grupo), 15 RSAs (3 por grupo), extensões de sitelink, frases de destaque, snippet e preço.

| Grupo | Destino | Observação |
|---|---|---|
| Gerador Link WhatsApp | `/gerador-de-link-whatsapp` | **Único que não vai para `/cadastrar`.** Ver decisão abaixo |
| Link na Bio | `/cadastrar` | |
| WhatsApp para Vendas | `/cadastrar` | |
| Encurtador com Cliques | `/cadastrar` | Só termos longos; "encurtador de link" genérico ficou de fora de propósito |
| Link na Bio para Vender | `/cadastrar` | Corretor, restaurante, loja, afiliado, oficina |

### Decisão que você pode desfazer: gerador vai para a página do gerador

O plano diz "destino `/cadastrar`". Mudei isso só no grupo do gerador, por dois motivos que já estão escritos no código (comentário em `gerador-de-link-whatsapp/page.tsx`): quem busca "gerar link de whatsapp" quer a ferramenta, não uma conta; e essa é a busca em que a landing tem chance de ranquear (concorrentes do tamanho do LinkFive, não Bitly). Mandar essa pessoa para um formulário de cadastro desperdiça o clique. A ferramenta é a porta de entrada e o cadastro vem depois.

Se preferir seguir o plano à risca, troque a coluna **Final URL** dos 3 anúncios desse grupo em `anuncios.csv` para `https://linkfive.com.br/cadastrar`.

### Ordem sugerida para ligar (R$ 20/dia é pouco para 5 grupos)

Com esse orçamento, cinco grupos disputando o mesmo dinheiro diluem os dados. Comece assim:

1. **Gerador Link WhatsApp** e **Link na Bio** — duas semanas
2. Pause os outros três grupos (pause o grupo, não apague)
3. Com dado de termos de pesquisa, ligue os demais um de cada vez

## Antes de ativar: conversão (obrigatório)

Sem conversão medida, o Google não otimiza e "Maximizar conversões" fica cego. **Hoje o site não tem evento de conversão.** O que existe:

- O GA4 (`gtag`) carrega em `/`, `/precos`, `/cadastrar`, `/entrar` e `/gerador-de-link-whatsapp` — mas só se `NEXT_PUBLIC_GA_ID` estiver configurada na Vercel (confirme; sem ela o script não carrega).
- Nenhum `gtag('event', ...)` é disparado em lugar nenhum. A conta criada com sucesso em `/cadastrar` (`router.push(d.destino ?? "/onboarding")`) não avisa o Google.

O que configurar, em ordem:

| # | Conversão | Tipo | Como |
|---|---|---|---|
| 1 | **Cadastro concluído** | Principal | Disparar `gtag('event','sign_up')` logo antes do `router.push` em `/cadastrar`, importar o evento do GA4 para o Google Ads como conversão |
| 2 | Uso do gerador (clicou em copiar/gerar) | Secundária | Evento no gerador; essencial para o grupo do gerador, cuja meta é o uso, não o cadastro |
| 3 | Assinatura paga | Depois | Vem do Lastlink (webhook em `/admin/cobranca`); importação offline quando houver as primeiras vendas |

Nenhuma dessas mudanças foi feita no código do site. É pequeno, mas mexe em produção; me peça quando quiser.

Marque só a **#1** como "principal" (a que otimiza o lance). A #2 fica como secundária, sem entrar na otimização, para o Google não passar a buscar usuários do gerador que nunca cadastram.

## Notas

- **UTM**: o site não lê `utm_*` hoje (busquei no código). O GA4 lê sozinho, então a origem aparece lá; o sufixo só ajuda a separar campanha e termo no GA4. Não afeta nada no produto.
- **Preços**: a extensão de preço usa R$ 10,90 (Starter mensal), R$ 19,90 (Pro mensal) e R$ 97,00 (Starter anual), conforme `projetos/linkfive/src/lib/limites.ts`. O `_memoria/estrategia.md` ainda cita R$ 19,90 / R$ 39,90 do plano antigo — está desatualizado. Se mudar os preços, mude a extensão junto, porque preço errado em anúncio é reclamação e reprovação.
- **Marca de concorrente**: nenhum anúncio cita Linktree. Só as palavras-chave "alternativa ao linktree" e "alternativa linktree" (Frase). Marca de terceiro no texto do anúncio pode levar a reprovação por marca registrada.
- **CPC**: não tenho dado real de CPC para esses termos. Antes de ativar, abra o Planejador de Palavras-chave (dentro da conta Google Ads) e veja a faixa de lance por grupo. Com R$ 20/dia, cada R$ 1 de CPC dá ~20 cliques/dia; a conta muda muito se o CPC real for R$ 0,50 ou R$ 3.
- **Chamadas**: não gerei `extensoes-chamadas.csv`. Não há telefone em `_memoria/empresa.md` e o objetivo é cadastro, não ligação.
- **Termos informacionais**: deixei "como" fora das negativas de propósito, porque "como criar link na bio" e "como criar link do whatsapp" são quase sempre gente que quer criar o link agora. Se o relatório de termos mostrar muito clique sem cadastro, adicione "como" como negativa de frase.
- **Search Partners e Display**: o CSV pede só "Google search" em Networks. Confira na primeira importação, porque o Editor às vezes reaplica o padrão da conta.
