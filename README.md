# GBM
Histórias para ler juntos

## Estrutura de imagens

Toda imagem fica em `/images`. Cada arte tem dois arquivos com o mesmo nome:

- `.png`: original em alta resolução (fonte, não usar na landing)
- `.webp`: versão leve para a web (é esta que a landing carrega)

```
images/
├── marca/        logo (svg é o master), ícone do app, favicons, og-image (compartilhamento)
├── hero/         banner principal (pai e filho / mãe e filha)
├── secoes/       origem (antes e depois), elo, curadoria
├── cards/        "Você escolhe o que plantar": valor-*.png e caminho-*.png
├── capas/        capas verticais 2:3 dos títulos avulsos e volumes
├── destaques/    versões 16:9 de capas para o carrossel de destaque
├── boxes/        artes 16:9 de box-* (continuação) e colecao-* (relacionados)
├── avatares/     avatares de perfil ("Quem está lendo?") + a folha original
└── _descartadas/ variações não usadas (manter até decidir apagar)
```

### Convenção de nomes
- Tudo em minúsculas, sem acento, palavras separadas por hífen.
- Volumes de box: `<box>-<n>-<titulo>` (ex.: `a-familia-2-o-filho-que-queria-outro-caminho`).
- Cards: `valor-<nome>` ou `caminho-<nome>`.

## Inventário

| Pasta | Tem | Falta |
|---|---|---|
| marca | logo (svg/png), logo horizontal, ícone, favicons, og-image | — |
| hero | pai e filho, mãe e filha | — |
| secoes | origem, elo (avô), elo (mãos), curadoria | — |
| cards | 7 valores (planta) e 6 caminhos (porta) | — |
| capas | 20 | — para a landing v1 |
| destaques | menino da vila, ilha das regras, turma do mucuripe | — |
| boxes | a família, dante, jesus, os três amigos*, william wallace, doutores da igreja, heróis de farda, josé de alencar, machado de assis | heróis de israel, fábulas |
| avatares | 8 | — |

\* `box-os-tres-amigos` deve ser refeita: capa verde e luz na mão do protagonista lembram demais a obra-mãe.

## Catálogo (`data/catalogo.json`)

Fonte única de todos os títulos, boxes e coleções. A landing lê este arquivo e a plataforma vai usá-lo para alimentar o banco.

- `titulos[]`: id, título, sinopse, obra-mãe (título, autor, tipo, idade sugerida), valores, caminhos, grupo (box ou coleção), volume, fileiras, capa.
- `grupos[]`: boxes (`tipo: box`, leitura em ordem) e coleções (`tipo: colecao`), com a arte e a lista de títulos.
- `vitrine: true` marca o que aparece na landing. O resto só aparece para quem assina.
- `capa: null` indica que a imagem ainda não foi gerada.

## Lançamentos

- `lancamento: true` no título e `lancamentos_ordem` na raiz do catálogo definem a fileira "Lançamentos", que aparece na landing e na plataforma.
- Quando a plataforma estiver no ar, trocar por uma data de lançamento (`lancado_em`) e mostrar os últimos 30 dias.

## Plataforma (especificação)

Dados de uso ficam no banco, fora do catálogo:

| Tabela | Campos |
|---|---|
| `perfis` | id, conta_id, nome, avatar, valores[], caminhos[] |
| `leituras` | perfil_id, titulo_id, pagina_atual, concluido_em |
| `avaliacoes` | conta_id, perfil_id, titulo_id, valor (gostei = 1, não gostei = 0), criado_em |
| `comentarios` | id, conta_id, titulo_id, texto, avaliacao, status (pendente, aprovado, recusado), criado_em |
| `interesses` | perfil_id, titulo_id |
| `anotacoes` | perfil_id, titulo_id, pagina, texto |

**Avaliação e comentários**
- Gostei e não gostei aparecem na última página, depois do quiz.
- Comentários são escritos pelo adulto da conta, nunca pela criança, e passam por moderação antes de aparecer.
- Mostrar o percentual de "gostei" só quando o título tiver avaliações suficientes (por exemplo, 20).

**Recomendações**, por perfil, nesta ordem:
1. Próximo volume de um box já começado.
2. Títulos com os valores e caminhos marcados no perfil.
3. Títulos que compartilham valores, caminhos ou coleção com os que o perfil marcou como "gostei".
4. Excluir os já lidos; rebaixar os parecidos com os marcados como "não gostei".
