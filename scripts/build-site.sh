#!/usr/bin/env bash
# Monta o site que a Vercel publica: landing, protótipo, imagens, catálogo e a plataforma em React (/plataforma).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .site && mkdir .site
cp -r landing app images data .site/
cp favicon.ico .site/ 2>/dev/null || true
(cd web && npm ci --no-audit --no-fund && npm run build)
cp -r web/dist .site/plataforma
echo "site montado em .site/"
