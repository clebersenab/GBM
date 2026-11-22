// Recomendação por perfil (híbrida, baseada em conteúdo).
//
// 1. Cada livro vira um vetor de características: valores, jornadas, fileira (literatura,
//    cinema, fé), box, coleção (separados) e tipo da obra semente.
// 2. O gosto da criança é a soma ponderada dos vetores dos livros com que ela interagiu:
//    lido e gostou 3 · lido 1,5 · lendo 1,2 · quero ler 1 · não gostou -2,
//    com peso que cai pela metade a cada 45 dias (o gosto muda com a idade).
// 3. O que os pais querem trabalhar entra no mesmo vetor:
//    foco escolhido no perfil (forte, 2,5) e o que eles exploram em "Plantar e cultivar"
//    (implícito, cresce devagar com o número de cliques).
// 4. Nota de cada livro não lido = similaridade de cosseno com o gosto
//    + bônus para o próximo volume de um box em andamento
//    − penalidade para volumes fora de ordem.
// 5. A fileira final passa por MMR (relevância × diversidade) para não sugerir
//    cinco livros quase iguais.
// Sem histórico (perfil novo), cai para vitrine + lançamentos + foco dos pais.
// Com uso real, o próximo passo é somar filtragem colaborativa item a item
// ("famílias que leram X também leram Y") no servidor.
import { CAMINHOS, TITULOS, LANCAMENTOS, byId, grupoById } from './catalog'

const W_STATUS = { quero_ler: 1, lendo: 1.2, lido: 1.5 }
const HALF_LIFE_DAYS = 45

function features(t) {
  const v = {}
  for (const x of t.valores || []) v['v:' + x] = 1
  for (const x of t.caminhos || []) v['c:' + x] = 1
  for (const x of t.fileiras || []) v['f:' + x] = 0.5
  if (t.box) v['b:' + t.box] = 0.8
  for (const x of t.colecoes || []) v['k:' + x] = 0.6 // coleção: chave própria, nunca misturada com box
  if (t.obra_mae?.tipo) v['o:' + t.obra_mae.tipo] = 0.3
  return v
}
const FEAT = Object.fromEntries(TITULOS.map((t) => [t.id, features(t)]))
const norm2 = (v) => Math.sqrt(Object.values(v).reduce((s, x) => s + x * x, 0)) || 1
function cosine(a, b) {
  let dot = 0
  for (const k in a) if (b[k]) dot += a[k] * b[k]
  return dot / (norm2(a) * norm2(b))
}
const add = (acc, v, w) => { for (const k in v) acc[k] = (acc[k] || 0) + v[k] * w }

export function tasteVector({ entries = [], profile, signals = [] }) {
  const taste = {}
  const now = Date.now()
  for (const e of entries) {
    const f = FEAT[e.slug]
    if (!f) continue
    let w = e.liked === false ? -2 : e.status === 'lido' && e.liked ? 3 : W_STATUS[e.status] || 1
    const days = (now - new Date(e.updated_at || now)) / 864e5
    w *= Math.pow(0.5, days / HALF_LIFE_DAYS)
    add(taste, f, w)
  }
  for (const v of profile?.focus_valores || []) add(taste, { ['v:' + v]: 1 }, 2.5)
  for (const c of profile?.focus_caminhos || []) add(taste, { ['c:' + c]: 1 }, 2.5)
  for (const s of signals) add(taste, { [(s.kind === 'valor' ? 'v:' : 'c:') + s.key]: 1 }, Math.min(1.5, 0.4 * Math.log2(1 + s.count)))
  return taste
}

// Próximo volume a ler de cada box já começado.
function boxProgress(entries) {
  const status = Object.fromEntries(entries.map((e) => [e.slug, e.status]))
  const next = {}
  for (const g of Object.values(grupoById)) {
    if (g.tipo !== 'box') continue
    const started = g.titulos.some((id) => status[id] === 'lido' || status[id] === 'lendo')
    const idx = g.titulos.findIndex((id) => status[id] !== 'lido')
    if (idx >= 0) next[g.id] = { id: g.titulos[idx], started }
  }
  return next
}

function reasonFor(t, taste, entries, nextOf) {
  const g = t.box && grupoById[t.box]
  if (g && nextOf[g.id]?.id === t.id && nextOf[g.id].started) return `Próximo do box ${g.titulo}`
  const top = Object.entries(taste).filter(([k, w]) => w > 0 && (k.startsWith('v:') || k.startsWith('c:')))
    .sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const hit = top.find((k) => (k[0] === 'v' ? t.valores : t.caminhos)?.includes(k.slice(2)))
  if (hit) return hit[0] === 'v' ? `Cultiva ${hit.slice(2)}` : `Jornada: ${hit.slice(2)}`
  const liked = entries.find((e) => e.liked && byId[e.slug] && cosine(FEAT[e.slug], FEAT[t.id]) > 0.3)
  if (liked) return `Porque gostou de ${byId[liked.slug].titulo}`
  return t.lancamento ? 'Lançamento' : 'Para começar'
}

export function scoreAll({ entries = [], profile, signals = [] }) {
  const taste = tasteVector({ entries, profile, signals })
  const seen = new Set(entries.filter((e) => e.status === 'lido' || e.liked === false).map((e) => e.slug))
  const nextOf = boxProgress(entries)
  const cold = Object.keys(taste).length === 0
  return TITULOS.filter((t) => !seen.has(t.id)).map((t) => {
    let s = cold ? 0 : cosine(taste, FEAT[t.id])
    if (t.box) {
      const n = nextOf[t.box]
      if (n?.id === t.id) s += n.started ? 0.6 : 0.05
      else s -= 0.35 // volume fora de ordem
    }
    if (cold) s += (t.vitrine ? 0.3 : 0) + (LANCAMENTOS.includes(t.id) ? 0.4 : 0)
    else if (t.lancamento) s += 0.05
    return { t, score: s, reason: reasonFor(t, taste, entries, nextOf) }
  }).sort((a, b) => b.score - a.score)
}

// MMR: escolhe um a um equilibrando nota (λ) e diferença para os já escolhidos.
export function diversify(scored, k = 12, lambda = 0.72) {
  const pool = scored.slice(0, 40)
  const picked = []
  while (picked.length < k && pool.length) {
    let best = 0, bestVal = -Infinity
    pool.forEach((c, i) => {
      const sim = picked.length ? Math.max(...picked.map((p) => cosine(FEAT[p.t.id], FEAT[c.t.id]))) : 0
      const val = lambda * c.score - (1 - lambda) * sim
      if (val > bestVal) { bestVal = val; best = i }
    })
    picked.push(pool.splice(best, 1)[0])
  }
  return picked
}

// Recomendados: só livros que ainda não estão na estante (descoberta).
export function recommend(ctx, k = 12) {
  const inList = new Set((ctx.entries || []).map((e) => e.slug))
  return diversify(scoreAll(ctx).filter((r) => !inList.has(r.t.id)), k)
}

// Valores se CULTIVAM (repetição): carrosséis "Para cultivar X" com o foco dos pais,
// ou com o que eles mais exploram em Plantar e cultivar.
// Valores em foco: só o que os pais escolheram (tirar do foco tira do Início na hora).
// O comportamento (cliques, lista) continua pesando nas recomendações, não aqui.
export function valueThemes({ profile }, max = 5) {
  return (profile?.focus_valores || []).slice(0, max).map((key) => ({ kind: 'valor', key, explicit: true }))
}

// Jornadas que os pais escolheram apresentar: cada uma ganha seu carrossel no Início.
export function journeyThemes({ profile }) {
  return (profile?.focus_caminhos || []).map((key) => ({ kind: 'caminho', key, explicit: true }))
}

// Livros de um tema: primeiro os ainda não lidos (pela nota do perfil), depois os lidos.
export function themeBooks(ctx, theme, k = 14) {
  const field = theme.kind === 'valor' ? 'valores' : 'caminhos'
  const status = Object.fromEntries((ctx.entries || []).map((e) => [e.slug, e.status]))
  const scored = Object.fromEntries(scoreAll(ctx).map((r) => [r.t.id, r.score]))
  return TITULOS.filter((t) => t[field]?.includes(theme.key))
    .sort((a, b) => (status[a.id] === 'lido') - (status[b.id] === 'lido') || (scored[b.id] ?? -9) - (scored[a.id] ?? -9))
    .slice(0, k)
}

export function themeRow(ctx, theme, k = 14) {
  const field = theme.kind === 'valor' ? 'valores' : 'caminhos'
  return scoreAll(ctx).filter((r) => r.t[field]?.includes(theme.key)).slice(0, k)
}

// Jornadas se DESCOBREM (amplitude): uma porta de cada vez. Uma jornada está "aberta" quando a
// criança leu (ou está lendo) um livro dela. Sugere um livro por porta ainda fechada, primeiro as
// que os pais escolheram apresentar, depois as que eles têm explorado, depois as demais.
export function doorsState({ entries = [], profile, signals = [] }) {
  const opened = {}
  for (const e of entries) {
    if (e.status !== 'lido' && e.status !== 'lendo') continue
    for (const c of byId[e.slug]?.caminhos || []) opened[c] = (opened[c] || 0) + 1
  }
  const chosen = profile?.focus_caminhos || []
  const sig = Object.fromEntries(signals.filter((s) => s.kind === 'caminho').map((s) => [s.key, s.count]))
  return CAMINHOS.map((c) => ({ key: c, opened: opened[c] || 0, chosen: chosen.includes(c), signal: sig[c] || 0 }))
}

export function newDoors(ctx, k = 6) {
  const scored = scoreAll(ctx)
  const used = new Set()
  return doorsState(ctx)
    .filter((d) => !d.opened && !d.chosen)
    .sort((a, b) => b.signal - a.signal)
    .map((d) => {
      const pick = scored.find((r) => r.t.caminhos?.includes(d.key) && !used.has(r.t.id) && !ctx.entries?.some((e) => e.slug === r.t.id && e.status !== 'quero_ler'))
      if (!pick) return null
      used.add(pick.t.id)
      return { ...d, t: pick.t }
    })
    .filter(Boolean)
    .slice(0, k)
}

// Ênfase, não cobertura: o que vem ocupando mais espaço nas leituras da criança.
// Valores: peso de cada leitura = lido 1 · lendo 0,5 · gostou +0,5 · não gostou −0,5,
//   com o mesmo decaimento de 45 dias (o que vem sendo trabalhado agora pesa mais).
// Jornadas (afinidade): o "gostei" pesa mais que o simples contato, porque indica identificação:
//   lido 1 · lendo 0,5 · gostou +1,5 · não gostou −1 (nunca abaixo de zero).
// É uma leitura dos sinais disponíveis, não um diagnóstico de aptidão.
export function emphasis(entries = []) {
  const now = Date.now()
  const acc = { valores: {}, caminhos: {} }
  const ev = { valores: {}, caminhos: {} }
  for (const e of entries) {
    const t = byId[e.slug]
    if (!t || (e.status !== 'lido' && e.status !== 'lendo')) continue
    const decay = Math.pow(0.5, (now - new Date(e.updated_at || now)) / 864e5 / HALF_LIFE_DAYS)
    const base = e.status === 'lido' ? 1 : 0.5
    const wv = Math.max(0, base + (e.liked === true ? 0.5 : e.liked === false ? -0.5 : 0)) * decay
    const wc = Math.max(0, base + (e.liked === true ? 1.5 : e.liked === false ? -1 : 0)) * decay
    for (const v of t.valores || []) {
      acc.valores[v] = (acc.valores[v] || 0) + wv
      ev.valores[v] = ev.valores[v] || { read: 0, liked: 0 }
      ev.valores[v].read++; if (e.liked) ev.valores[v].liked++
    }
    for (const c of t.caminhos || []) {
      acc.caminhos[c] = (acc.caminhos[c] || 0) + wc
      ev.caminhos[c] = ev.caminhos[c] || { read: 0, liked: 0 }
      ev.caminhos[c].read++; if (e.liked) ev.caminhos[c].liked++
    }
  }
  const rank = (kind) => {
    const total = Object.values(acc[kind]).reduce((s, x) => s + x, 0)
    return Object.entries(acc[kind]).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1])
      .map(([key, w]) => ({ key, w, pct: total ? w / total : 0, ...ev[kind][key] }))
  }
  return { valores: rank('valores'), caminhos: rank('caminhos') }
}
