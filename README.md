# GBM
Histórias para ler juntos

## Estrutura do projeto

```
/
├── landing/      página de venda (landing/index.html), servida em gbm…/
├── app/          plataforma do assinante (app/index.html), hoje um protótipo navegável
├── images/       imagens compartilhadas pela landing e pelo app
├── data/         catálogo (catalogo.json), lido pela landing e pelo app
├── backend/      API em Rails 8 + Postgres (controle de acesso); veja backend/README.md
├── vercel.json   faz a raiz do site abrir a landing
└── README.md
```

- A raiz não guarda arquivos soltos. Imagem nova vai direto para a pasta certa em `/images`.
- `data/` fica fora de `landing/` e `app/` porque os dois leem o mesmo catálogo.
- A API fica em `backend/`, e não em `api/`, porque a Vercel trata a pasta `api/` como funções serverless e quebra o deploy. O `.vercelignore` tira o backend do deploy da Vercel; ele roda em outro servidor.
- As páginas usam caminhos relativos (`../images`, `../data`), então funcionam no Vercel e localmente.
- Quando o app crescer (login, banco, build), ele ganha o próprio `package.json` dentro de `app/`, sem mexer na landing.

### Imagens

Cada arte tem dois arquivos com o mesmo nome:

- `.png`: original em alta resolução (fonte, não usar nas páginas)
- `.webp`: versão leve para a web (é esta que as páginas carregam)

```
images/
├── marca/        logo e símbolo (svg é o master; transparente, fundo claro e fundo escuro), logo-nav, logo-web, favicons, og-image, referencia/
├── hero/         banner principal (pai e filho / mãe e filha)
├── secoes/       origem (antes e depois), elo, curadoria
├── cards/        "Você escolhe o que plantar": valor-* (planta) e caminho-* (porta)
├── capas/        capas verticais 2:3 dos títulos avulsos e volumes
├── destaques/    versões 16:9 de algumas capas (uso futuro em anúncios e no app)
├── boxes/        artes 16:9 de box-* (continuação) e colecao-* (relacionados)
├── avatares/     avatares de perfil ("Quem está lendo?") + a folha original
├── plataforma/   capturas do protótipo do app, usadas na landing
└── _descartadas/ versões substituídas (manter até decidir apagar)
```

### Convenção de nomes
- Tudo em minúsculas, sem acento, palavras separadas por hífen.
- Volumes de box: `<box>-<n>-<titulo>` (ex.: `a-familia-2-o-filho-que-queria-outro-caminho`).
- Cards: `valor-<nome>` ou `caminho-<nome>`.

## Inventário

Catálogo inicial completo: 62 títulos com capa, 14 boxes e coleções com arte, 13 cards (7 valores e 6 caminhos), marca v2.

## Catálogo (`data/catalogo.json`)

Fonte única de todos os títulos, boxes e coleções. A landing lê este arquivo e a plataforma vai usá-lo para alimentar o banco.

- `titulos[]`: id, título, sinopse, obra-mãe (título, autor, tipo, idade sugerida), valores, caminhos, `box` (no máximo um, porque define a ordem de leitura), `volume`, `colecoes` (quantas forem: um título pode estar em várias), fileiras, capa.
- Exemplo: *Davi e o Gigante* está no box Heróis de Israel (volume 2) e na coleção Histórias Bíblicas; *Paulo e o Naufrágio* está nas coleções Santos da Igreja e Histórias Bíblicas.
- `grupos[]`: boxes (`tipo: box`, leitura em ordem) e coleções (`tipo: colecao`), com a arte e a lista de títulos.
- `vitrine: true` marca o que aparece na landing. O resto só aparece para quem assina.
- `capa: null` indica que a imagem ainda não foi gerada (hoje nenhum título está assim).

## Lançamentos

- `lancamento: true` no título e `lancamentos_ordem` na raiz do catálogo definem a fileira "Lançamentos", que aparece na landing e na plataforma.
- Quando a plataforma estiver no ar, trocar por uma data de lançamento (`lancado_em`) e mostrar os últimos 30 dias.

## Plataforma (especificação)

Protótipo navegável em `app/index.html` (perfis, estante, leitor, fim do livro). As telas da landing em `images/plataforma` são capturas desse protótipo.

Estados de leitura por perfil: **não iniciado**, **iniciado** (com página atual), **lido**. A estante mostra "Continue lendo" (iniciados), "Indicados", "Lançamentos" e "Tenho interesse" (com filtro lidos e não lidos).

Na landing, esses recursos não são listados: aparecem só nas capturas de tela.

Dados de uso ficam no banco, fora do catálogo:

| Tabela | Campos |
|---|---|
| `perfis` | id, conta_id, nome, avatar, valores[], caminhos[] |
| `leituras` | perfil_id, titulo_id, pagina_atual, concluido_em |
| `avaliacoes` | conta_id, perfil_id, titulo_id, valor (gostei = 1, não gostei = 0), criado_em |
| `comentarios` | id, conta_id, titulo_id, texto, avaliacao, status (pendente, aprovado, recusado), criado_em |
| `interesses` | perfil_id, titulo_id |
| `anotacoes` | perfil_id, titulo_id, pagina, texto |
| `marcacoes` | perfil_id, titulo_id, pagina, trecho (início e fim), cor |
| `marca_pagina` | perfil_id, titulo_id, pagina |

**Avaliação e comentários**
- Gostei e não gostei aparecem na última página, depois do quiz.
- Comentários são escritos pelo adulto da conta, nunca pela criança, e passam por moderação antes de aparecer.
- Mostrar o percentual de "gostei" só quando o título tiver avaliações suficientes (por exemplo, 20).

**Recomendações**, por perfil, nesta ordem:
1. Próximo volume de um box já começado.
2. Títulos com os valores e caminhos marcados no perfil.
3. Títulos que compartilham valores, caminhos ou coleção com os que o perfil marcou como "gostei".
4. Excluir os já lidos; rebaixar os parecidos com os marcados como "não gostei".
