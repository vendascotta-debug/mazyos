# Como importar no Google Ads Editor

Campanha: **LinkFive - Search Brasil** — 5 grupos, 65 palavras-chave, 106 negativas, 15 anúncios (RSA).

## Passo a passo

1. Abra o **Google Ads Editor** (desktop) e baixe a conta.
2. Menu **Conta → Importar → De arquivo CSV** (ou "Fazer alterações em massa → Colar/Importar").
3. Importe **nesta ordem** (o Editor precisa que a campanha exista antes do grupo, etc.):
   1. `campanhas.csv`
   2. `grupos.csv`
   3. `keywords.csv`
   4. `keywords-negativas.csv`
   5. `anuncios.csv`
   6. `extensoes-sitelinks.csv`
   7. `extensoes-frases.csv`
   8. `extensoes-snippets.csv`
   9. `extensoes-preco.csv`
4. Em cada importação, confira o resumo "Pronto para importar" antes de aceitar.
5. Confira em **Campanhas**: status **Pausada**, orçamento R$ 20,00, lance "Maximizar conversões".
6. Confira a **localização** (Brasil, presença) e desmarque parceiros de pesquisa e Display se aparecerem marcados. O Editor às vezes ignora a coluna `Location` do CSV; se for o caso, defina em **Locais**.
7. Faça **Publicar** só depois do checklist de conversão de `configuracoes.md`.

## Se o Editor reclamar

- **Cabeçalho não reconhecido**: as colunas seguem o padrão em inglês do Editor. Se a conta estiver em português, troque o idioma do Editor para inglês ou renomeie as colunas.
- **Acentos quebrados**: os arquivos já estão em UTF-8 com BOM. Se ainda quebrar, abra no Excel e salve como "CSV UTF-8".
- **Extensão de preço rejeitada**: é a mais sensível a formato. Se falhar, crie manualmente em Ativos → Preços com os 3 itens do CSV.
- **`Structured snippet values` rejeitado**: o Editor às vezes exige uma coluna por valor. Crie manualmente com o cabeçalho "Catálogo de serviços" e os 6 valores.

## Depois de subir

A primeira semana serve para olhar **termos de pesquisa**, não para otimizar lance. Adicione como negativa o que for irrelevante e anote o que converte.
