// Busca da barra superior.
//
// O catálogo cabe inteiro no navegador, então a busca roda local, sem ida ao servidor:
// um índice é montado uma única vez e cada tecla só percorre listas já normalizadas.
//
// Prioridade (cada campo tem um peso; o melhor campo de cada título decide a ordem):
//   1. Título ................ 100 começa com a busca · 85 alguma palavra começa · 70 contém · 55 com 1 erro de digitação
//   2. Obra semente e autor .. 60 / 50 / 40
//   3. Box ou coleção ........ 45
//   4. Valores e jornadas .... 35
//   5. Sinopse ............... 20 + 4 por palavra encontrada
// Todas as palavras digitadas precisam aparecer (em qualquer campo); com 2 ou mais palavras, quem
// bate só metade ainda entra, mais abaixo.
// Tolerância a erro (distância de edição ≤ 1) só nos títulos e só para palavras com 3+ letras,
// para não deixar a busca lenta nem trazer lixo.
//
// Quando o catálogo crescer para milhares de títulos, a mesma ordem vai para o Postgres:
// tsvector com pesos A (título), B (obra semente), C (valores/box), D (sinopse) + pg_trgm para erros.
import { TITULOS, grupoById, norm } from './catalog'

const words = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean)

const INDEX = TITULOS.map((t) => {
  const g = t.box && grupoById[t.box]
  const cols = (t.colecoes || []).map((id) => grupoById[id]?.titulo).filter(Boolean)
  const f = {
    titulo: norm(t.titulo),
    semente: norm(t.obra_mae?.titulo),
    autor: norm(t.obra_mae?.autor),
    grupo: norm([g?.titulo, ...cols].filter(Boolean).join(' ')),
    temas: norm([...(t.valores || []), ...(t.caminhos || [])].join(' ')),
    sinopse: norm(t.sinopse),
  }
  return { t, f, tituloWords: words(t.titulo), all: Object.values(f).join(' ') }
})

// Distância de edição limitada a 1 (rápida: para cedo).
function within1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

function fieldScore(text, q, [start, word, contains]) {
  if (!text) return 0
  if (text.startsWith(q)) return start
  if (text.includes(' ' + q)) return word
  if (text.includes(q)) return contains
  return 0
}

const WHY = { titulo: 'Título', semente: 'Obra semente', autor: 'Obra semente', grupo: 'Box ou coleção', temas: 'Valores e jornadas', sinopse: 'Sinopse' }

export function search(raw, limit = 8) {
  const q = norm(raw).trim()
  if (q.length < 2) return []
  const tokens = q.split(/\s+/)
  const out = []
  for (const row of INDEX) {
    const { f } = row
    // Cada palavra precisa aparecer em algum campo (ou no título com 1 erro de digitação).
    const hits = tokens.filter((tk) => row.all.includes(tk) ||
      (tk.length >= 3 && row.tituloWords.some((w) => within1(w.slice(0, tk.length), tk) || within1(w, tk)))).length
    // Com várias palavras, aceita quem bate pelo menos metade (frase da sinopse lembrada pela metade),
    // mas joga para baixo.
    if (hits < tokens.length && (tokens.length < 2 || hits < Math.ceil(tokens.length / 2))) continue
    const partial = hits < tokens.length ? 0.6 : 1

    const scores = {
      titulo: fieldScore(f.titulo, q, [100, 85, 70]),
      semente: fieldScore(f.semente, q, [60, 50, 40]),
      autor: fieldScore(f.autor, q, [50, 45, 40]),
      grupo: fieldScore(f.grupo, q, [45, 45, 40]),
      temas: fieldScore(f.temas, q, [35, 35, 30]),
      sinopse: 0,
    }
    // Todas as palavras no título, fora de ordem ("ilha regras" -> "A Ilha das Regras")
    if (tokens.length > 1 && tokens.every((tk) => row.tituloWords.some((w) => w.startsWith(tk)))) scores.titulo = Math.max(scores.titulo, 80)
    if (tokens.length > 1 && tokens.every((tk) => f.semente.includes(tk) || f.autor.includes(tk))) scores.semente = Math.max(scores.semente, 48)
    const inSinopse = tokens.filter((tk) => f.sinopse.includes(tk)).length
    if (inSinopse) scores.sinopse = 20 + inSinopse * 4
    if (!Object.values(scores).some(Boolean)) {
      // várias palavras espalhadas pelos campos, ou erro de digitação no título
      const inTitle = tokens.filter((tk) => f.titulo.includes(tk)).length
      scores.titulo = inTitle ? 50 + inTitle * 5 : 55
    }
    const [field, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
    out.push({ t: row.t, score: Math.round(score * partial), why: WHY[field], field })
  }
  return out.sort((a, b) => b.score - a.score || a.t.titulo.localeCompare(b.t.titulo)).slice(0, limit)
}
