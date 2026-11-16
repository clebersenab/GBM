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
| cards | fé, coragem, empreender, ciência e invenção | honestidade, amizade, curiosidade, perseverança, família, medicina, exploração, servir e proteger, raízes do brasil |
| capas | 20 | — para a landing v1 |
| destaques | menino da vila, ilha das regras, turma do mucuripe | — |
| boxes | a família, dante, jesus, os três amigos*, william wallace, doutores da igreja, heróis de farda, josé de alencar, machado de assis | heróis de israel, como o mundo começou, fábulas |
| avatares | 8 | — |

\* `box-os-tres-amigos` deve ser refeita: capa verde e luz na mão do protagonista lembram demais a obra-mãe.
