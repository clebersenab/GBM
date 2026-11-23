"""Gera miniaturas leves para listas e carrosséis (as originais ficam para fichas e telas grandes).
Uso: python3 scripts/thumbs.py   (rodar de novo ao adicionar capas, cards ou artes de box)
Saída: images/t/<pasta>/<arquivo>.webp
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "images"
SETS = {"capas": 400, "cards": 240, "boxes": 800}  # largura máxima

for folder, width in SETS.items():
    out = ROOT / "t" / folder
    out.mkdir(parents=True, exist_ok=True)
    for src in sorted((ROOT / folder).glob("*.webp")):
        dst = out / src.name
        if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            continue
        im = Image.open(src).convert("RGB")
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=78, method=6)
        print(dst.relative_to(ROOT))
