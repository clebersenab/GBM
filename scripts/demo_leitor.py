"""Gera o livro de amostra do leitor: content/livros/demo-leitor.json e ilustrações SVG simples.
Texto e ilustrações são provisórios: servem só para testar o leitor."""
import json, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "images", "livros", "demo-leitor")
os.makedirs(IMG, exist_ok=True)

# (céu topo, céu base, chão/água, cena)
CENAS = [
    ("#9fd3f2", "#e9f6ff", "#7cc4a4", "mesa"),
    ("#8a95a8", "#c9d0db", "#6f7d8c", "chuva"),
    ("#8a95a8", "#c9d0db", "#5d6b7a", "rua"),
    ("#8a95a8", "#c9d0db", "#5d6b7a", "bueiro"),
    ("#a8c8e0", "#e8eef2", "#4f8fb8", "canal"),
    ("#a8c8e0", "#f2e8d8", "#4f8fb8", "pato"),
    ("#f5b98a", "#fde6c8", "#3f86b5", "ponte"),
    ("#f29e7a", "#fbd9b5", "#2f78a8", "mar"),
    ("#2d3a66", "#6e6aa0", "#1f4a73", "noite"),
    ("#ffd7a0", "#fff1d6", "#3a8cc0", "jangada"),
    ("#ffd7a0", "#fff1d6", "#e8cf9c", "praia"),
    ("#9fd3f2", "#e9f6ff", "#7cc4a4", "janela"),
]

def barco(x, y, s=1.0, cor="#fffaf0"):
    return (f'<g transform="translate({x} {y}) scale({s})">'
            f'<path d="M-90 0 L90 0 L60 40 L-60 40 Z" fill="{cor}" stroke="#2b2118" stroke-width="5" stroke-linejoin="round"/>'
            f'<path d="M-40 0 L0 -80 L40 0 Z" fill="{cor}" stroke="#2b2118" stroke-width="5" stroke-linejoin="round"/>'
            f'<path d="M0 -80 L0 0" stroke="#2b2118" stroke-width="3"/></g>')

def crianca(x, y, cor, cabelo):
    return (f'<g transform="translate({x} {y})">'
            f'<rect x="-30" y="0" width="60" height="90" rx="26" fill="{cor}" stroke="#2b2118" stroke-width="5"/>'
            f'<circle cx="0" cy="-30" r="34" fill="#f2c9a0" stroke="#2b2118" stroke-width="5"/>'
            f'<path d="M-34 -36 Q0 -80 34 -36 Q20 -54 0 -54 Q-20 -54 -34 -36Z" fill="{cabelo}" stroke="#2b2118" stroke-width="4"/>'
            f'<circle cx="-12" cy="-30" r="4" fill="#2b2118"/><circle cx="12" cy="-30" r="4" fill="#2b2118"/>'
            f'<path d="M-10 -14 Q0 -6 10 -14" stroke="#2b2118" stroke-width="4" fill="none" stroke-linecap="round"/></g>')

TRIO = lambda y=560: crianca(330, y, "#f28c28", "#4a2c17") + crianca(450, y + 20, "#62c8ed", "#2b2118") + crianca(570, y, "#9146b5", "#8a4b1f")

def ondas(cor, y=640):
    d = f"M0 {y} " + " ".join(f"Q{75+150*i} {y-22} {150+150*i} {y} T{300+150*i} {y}" for i in range(0, 8, 2)) + " L1200 900 L0 900Z"
    return f'<path d="{d}" fill="{cor}"/>'

def chuva():
    return "".join(f'<path d="M{x} {y} l-10 30" stroke="#ffffff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/>'
                   for x in range(40, 1200, 70) for y in (60 + (x * 37) % 200, 300 + (x * 53) % 200))

def cena(i, topo, base, chao, tipo):
    w, h = 1200, 900
    sol = '' if tipo in ("chuva", "rua", "bueiro", "noite") else f'<circle cx="980" cy="170" r="80" fill="#ffd65a"/>'
    if tipo == "noite":
        sol = '<circle cx="980" cy="160" r="60" fill="#fff4d0"/>' + "".join(
            f'<circle cx="{x}" cy="{y}" r="4" fill="#fff"/>' for x, y in [(120, 90), (300, 160), (520, 70), (700, 200), (850, 110), (400, 260)])
    corpo = {
        "mesa": f'<rect x="150" y="620" width="900" height="40" rx="10" fill="#c98a52" stroke="#2b2118" stroke-width="5"/>' + TRIO(470) + barco(600, 600, .8),
        "chuva": f'<rect x="0" y="640" width="1200" height="260" fill="{chao}"/>' + chuva() + TRIO(480) + barco(450, 470, .6),
        "rua": f'<rect x="0" y="640" width="1200" height="260" fill="{chao}"/><path d="M0 700 Q600 670 1200 720 L1200 760 Q600 720 0 750Z" fill="#9cc9e8"/>' + chuva() + barco(380, 700, .7) + crianca(900, 520, "#f28c28", "#4a2c17"),
        "bueiro": f'<rect x="0" y="640" width="1200" height="260" fill="{chao}"/><rect x="520" y="700" width="200" height="70" rx="10" fill="#2b2118"/>' + "".join(f'<rect x="{530+i*38}" y="705" width="16" height="60" fill="#6f7d8c"/>' for i in range(5)) + barco(560, 680, .55) + chuva(),
        "canal": ondas(chao) + barco(600, 610, .9),
        "pato": ondas(chao) + barco(450, 610, .8) + '<g transform="translate(820 600)"><ellipse cx="0" cy="0" rx="70" ry="40" fill="#ffd65a" stroke="#2b2118" stroke-width="5"/><circle cx="55" cy="-45" r="30" fill="#ffd65a" stroke="#2b2118" stroke-width="5"/><path d="M80 -45 l30 8 l-30 8z" fill="#f28c28" stroke="#2b2118" stroke-width="3"/><circle cx="60" cy="-52" r="4" fill="#2b2118"/></g>',
        "ponte": f'<path d="M0 520 Q600 320 1200 520 L1200 560 Q600 370 0 560Z" fill="#c98a52" stroke="#2b2118" stroke-width="5"/>' + ondas(chao) + barco(600, 620, .8),
        "mar": ondas(chao, 600) + barco(600, 590, .7) + '<path d="M200 600 l40 -60 l40 60z" fill="#fffaf0" opacity=".6"/>',
        "noite": ondas(chao, 620) + barco(600, 610, .7, "#fff4d0"),
        "jangada": ondas(chao, 620) + barco(380, 610, .55) + '<g transform="translate(780 600)"><rect x="-150" y="0" width="300" height="30" fill="#c98a52" stroke="#2b2118" stroke-width="5"/><path d="M-10 0 L-10 -260 L130 -40 Z" fill="#fffaf0" stroke="#2b2118" stroke-width="5"/></g>',
        "praia": f'<path d="M0 560 Q600 520 1200 580 L1200 900 L0 900Z" fill="#3a8cc0"/><path d="M0 680 Q600 640 1200 700 L1200 900 L0 900Z" fill="{chao}"/>' + barco(600, 690, .6) + TRIO(560),
        "janela": f'<rect x="200" y="140" width="800" height="560" rx="20" fill="#fff" stroke="#2b2118" stroke-width="8"/><rect x="230" y="170" width="740" height="500" fill="url(#c)"/><path d="M600 170 L600 670 M230 420 L970 420" stroke="#2b2118" stroke-width="6"/>' + barco(600, 780, .7) + TRIO(560),
    }[tipo]
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1">'
           f'<stop offset="0" stop-color="{topo}"/><stop offset="1" stop-color="{base}"/></linearGradient></defs>'
           f'<rect width="{w}" height="{h}" fill="url(#c)"/>{sol}{corpo}</svg>')
    open(os.path.join(IMG, f"p{i+1:02d}.svg"), "w").write(svg)
    return f"images/livros/demo-leitor/p{i+1:02d}.svg"

TEXTOS = [
    ("Numa tarde de chuva em Fortaleza, Giovana, Bento e Maria acharam uma folha de jornal velha. Giovana dobrou, Bento apertou as pontas e Maria fez o mastro. Pronto: um barquinho de papel.",
     "Se vocês fossem fazer um barquinho, que nome dariam a ele?", "Três crianças em volta de uma mesa com um barquinho de papel."),
    ("A chuva caía forte lá fora. A rua virou um riozinho que corria ligeiro em direção ao mar. — Vamos ver até onde ele vai? — perguntou Bento.",
     "Para onde você acha que a água da chuva vai?", "As crianças olham a chuva com o barquinho nas mãos."),
    ("Maria colocou o barquinho na água com cuidado. Ele balançou, girou duas vezes e saiu navegando, todo valente, pelo meio-fio.",
     "Como você acha que o barquinho está se sentindo agora?", "O barquinho navega na enxurrada da rua."),
    ("De repente, o barquinho chegou perto de um bueiro. — Cuidado! — gritou Giovana. O barquinho rodopiou na beirada, quase caiu… e passou por cima, por um triz.",
     "O que você faria se visse o barquinho chegando perto do bueiro?", "O barquinho passa por cima de uma grade de bueiro."),
    ("A enxurrada levou o barquinho até o canal. Ali a água era larga e calma. O barquinho seguiu sozinho, cada vez mais longe das crianças.",
     "Você já foi a algum lugar sozinho pela primeira vez? Como foi?", "O barquinho navega num canal largo."),
    ("No canal, ele encontrou um pato amarelo. — Para onde você vai, barquinho? — Vou ver o mar — respondeu o barquinho, mesmo sem saber o caminho.",
     "Por que será que o barquinho quer tanto ver o mar?", "O barquinho conversa com um pato amarelo."),
    ("Passou debaixo de uma ponte grande. Lá em cima, os carros buzinavam. Lá embaixo, o barquinho seguia, pequeno e firme, sem desistir.",
     "O que quer dizer não desistir? Você lembra de uma vez em que não desistiu?", "O barquinho passa debaixo de uma ponte."),
    ("E então, no fim do canal, apareceu uma coisa enorme, azul e cheia de ondas. Era o mar! O barquinho nunca tinha visto tanta água junta.",
     "Como você imagina o mar pela primeira vez?", "O canal encontra o mar."),
    ("A noite chegou. O papel estava molhado e mole, mas as estrelas brilhavam lá em cima. O barquinho boiava devagar, olhando o céu.",
     "O barquinho está cansado. O que ajuda você quando está cansado?", "O barquinho boia no mar à noite, sob as estrelas."),
    ("De manhã, uma jangada de pescador passou por perto. O pescador viu o barquinho, sorriu e o colocou com cuidado na areia da praia.",
     "Por que o pescador ajudou o barquinho?", "Uma jangada passa perto do barquinho no mar."),
    ("Na praia, três crianças conhecidas corriam pela areia. Eram Giovana, Bento e Maria, que tinham vindo procurar o barquinho com a avó.",
     "Como você acha que as crianças se sentiram ao encontrar o barquinho?", "As crianças encontram o barquinho na areia."),
    ("O barquinho voltou para casa amassado, mas inteiro. Hoje ele mora na janela, e toda vez que chove as crianças lembram da grande viagem que ele fez.",
     "Se o barquinho pudesse contar a viagem, o que ele contaria primeiro?", "O barquinho na janela da casa das crianças."),
]

paginas = [{"imagem": cena(i, *CENAS[i]), "texto": t, "pergunta": q, "alt": a} for i, (t, q, a) in enumerate(TEXTOS)]

livro = {
    "slug": "demo-leitor",
    "titulo": "O barquinho de papel",
    "amostra": True,
    "aviso": "Livro de amostra para testar o leitor. Texto e ilustrações provisórios.",
    "capa": paginas[0]["imagem"],
    "paginas": paginas,
    "vocabulario": [
        {"palavra": "Enxurrada", "significado": "Muita água de chuva correndo pela rua."},
        {"palavra": "Meio-fio", "significado": "A beirada de pedra entre a calçada e a rua."},
        {"palavra": "Jangada", "significado": "Barco de pescador feito de troncos, com uma vela grande."},
    ],
    "quiz": [
        {"pergunta": "Do que as crianças fizeram o barquinho?", "opcoes": ["De madeira", "De jornal velho", "De plástico"], "certa": 1,
         "explica": "Elas dobraram uma folha de jornal velha."},
        {"pergunta": "Quem o barquinho encontrou no canal?", "opcoes": ["Um peixe", "Um pato amarelo", "Uma gaivota"], "certa": 1,
         "explica": "Foi o pato amarelo que perguntou para onde ele ia."},
        {"pergunta": "Quem colocou o barquinho na areia?", "opcoes": ["Um pescador", "A avó", "O pato"], "certa": 0,
         "explica": "O pescador da jangada o colocou na praia com cuidado."},
    ],
    "quando_crescer": None,
}
os.makedirs(os.path.join(ROOT, "backend", "content", "livros"), exist_ok=True)
json.dump(livro, open(os.path.join(ROOT, "backend", "content", "livros", "demo-leitor.json"), "w"), ensure_ascii=False, indent=1)
print(sum(len(t.split()) for t, _, _ in TEXTOS), "palavras")

# Moby Dick usa o mesmo texto provisório até a história definitiva ficar pronta (só com assinatura).
# Um livro com "livre": True abriria sem assinatura; não usado por enquanto.
moby = {**livro, "slug": "moby-dick", "titulo": "Moby Dick", "amostra": False, "capa": "images/capas/moby-dick.webp",
        "aviso": "Texto provisório para testar o leitor. A história do Moby Dick entra depois."}
json.dump(moby, open(os.path.join(ROOT, "backend", "content", "livros", "moby-dick.json"), "w"), ensure_ascii=False, indent=1)
