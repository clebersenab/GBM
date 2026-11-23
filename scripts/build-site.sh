#!/usr/bin/env bash
# Monta o site que a Vercel publica: landing, protótipo, imagens, catálogo e a plataforma em React (/plataforma).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .site && mkdir .site
cp -r landing app data .site/
# imagens sem os originais em PNG e sem as descartadas (o site só usa .webp; marca e favicons ficam)
mkdir -p .site/images
(cd images && find . -path ./_descartadas -prune -o -type f -print | while read -r f; do
  case "$f" in ./marca/*) ;; *.png) continue ;; esac
  mkdir -p "../.site/images/$(dirname "$f")" && cp "$f" "../.site/images/$f"
done)
cp landing/robots.txt landing/sitemap.xml .site/
cp favicon.ico .site/ 2>/dev/null || true
(cd web && npm ci --no-audit --no-fund && npm run build)
cp -r web/dist .site/plataforma
echo "site montado em .site/"
