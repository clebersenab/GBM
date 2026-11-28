// Reservas para navegadores sem color-mix() (Safari antes do 16.2, como o iPadOS 15).
// Para cada declaração com color-mix, escreve antes dela a mesma declaração com uma cor simples:
// a cor de maior peso da mistura. O Safari antigo ignora a linha com color-mix e fica com a reserva;
// os navegadores novos usam a mistura, que vem depois.
// Variáveis CSS (--x: color-mix(...)) não descartam valor inválido; nelas a reserva fica na variável
// e a mistura volta dentro de @supports, só para quem a entende.
// Também dá reserva às unidades de contêiner (cqw/cqi, Safari antes do 16): com --cq=0.43vw, "5cqw" vira
// "calc(5 * 0.43vw)" numa linha antes da original (no leitor, cada página tem cerca de 43% da largura da tela).
// Uso: node scripts/css-reserva.mjs [--cq=0.43vw] arquivo.css|arquivo.html ...
import { readFileSync, writeFileSync } from 'node:fs'

const SUPORTA = '@supports (color:color-mix(in srgb,red 50%,blue))'

// fecha o parêntese que abre em s[i] (s[i] === '('); devolve o índice do ')' correspondente
function fecha(s, i) {
  let d = 0
  for (let k = i; k < s.length; k++) {
    if (s[k] === '(') d++
    else if (s[k] === ')') { d--; if (!d) return k }
  }
  return -1
}

// divide nos vírgulas de nível zero
function partes(s) {
  const out = []; let d = 0, ini = 0
  for (let k = 0; k < s.length; k++) {
    if (s[k] === '(') d++
    else if (s[k] === ')') d--
    else if (s[k] === ',' && !d) { out.push(s.slice(ini, k).trim()); ini = k + 1 }
  }
  out.push(s.slice(ini).trim())
  return out
}

// "var(--x) 30%" -> { cor: 'var(--x)', p: 30 }
function corPeso(a) {
  const m = a.match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/s)
  return m ? { cor: m[1].trim(), p: parseFloat(m[2]) } : { cor: a.trim(), p: null }
}

// Cores conhecidas: variáveis definidas uma única vez no arquivo (no site claro/escuro da plataforma, as que
// mudam com o tema ficam de fora e caem na regra antiga, da cor de maior peso).
let VARS = {}
export function lerVars(txt) {
  const defs = {}
  for (const m of txt.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) (defs[m[1]] ||= new Set()).add(m[2].trim())
  VARS = Object.fromEntries(Object.entries(defs).filter(([, v]) => v.size === 1).map(([k, v]) => [k, [...v][0]]))
}
// "#0b0d17", "rgba(…)", "transparent", "var(--bg)" -> [r,g,b,a] ou null
function rgba(c, fundo = 0) {
  c = c.trim()
  if (fundo > 5) return null
  const v = c.match(/^var\((--[\w-]+)\)$/)
  if (v) return VARS[v[1]] ? rgba(VARS[v[1]], fundo + 1) : null
  if (c === 'transparent') return [0, 0, 0, 0]
  let m = c.match(/^#([0-9a-f]{3,8})$/i)
  if (m) {
    let h = m[1]
    if (h.length <= 4) h = [...h].map((x) => x + x).join('')
    const n = (i) => parseInt(h.slice(i, i + 2), 16)
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
  }
  m = c.match(/^rgba?\(([^)]+)\)$/)
  if (m) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat)
    return [p[0], p[1], p[2], p[3] ?? 1]
  }
  return null
}
// mistura exata em srgb (com transparência pré-multiplicada, como o navegador faz)
function mistura(c1, p1, c2) {
  const a = rgba(c1), b = rgba(c2)
  if (!a || !b) return null
  const t = p1 / 100, al = a[3] * t + b[3] * (1 - t)
  if (al === 0) return 'transparent'
  const ch = (i) => Math.round((a[i] * a[3] * t + b[i] * b[3] * (1 - t)) / al)
  return `rgba(${ch(0)},${ch(1)},${ch(2)},${+al.toFixed(3)})`
}

// troca todos os color-mix(...) de um valor por uma cor simples (dos mais internos para fora):
// a mistura exata quando as duas cores são conhecidas; senão, a cor de maior peso
export function simplifica(v) {
  for (let guarda = 0; guarda < 50; guarda++) {
    const i = v.lastIndexOf('color-mix(')
    if (i < 0) return v
    const a = i + 'color-mix'.length, f = fecha(v, a)
    if (f < 0) return v
    const [, x, y] = partes(v.slice(a + 1, f))
    const c1 = corPeso(x), c2 = corPeso(y || 'transparent')
    const p1 = c1.p ?? (c2.p != null ? 100 - c2.p : 50)
    const exata = mistura(c1.cor, p1, c2.cor)
    v = v.slice(0, i) + (exata || (p1 >= 50 ? c1.cor : c2.cor)) + v.slice(f + 1)
  }
  return v
}

// processa um texto CSS
export function reserva(css) {
  let out = '', i = 0, extras = []
  const ini = /color-mix\(/g
  let m
  // percorre declaração por declaração que contenha color-mix
  while ((m = ini.exec(css))) {
    if (m.index < i) continue
    // início da declaração: depois do último '{' ou ';' antes do color-mix
    const a = Math.max(css.lastIndexOf('{', m.index), css.lastIndexOf(';', m.index)) + 1
    // fim: próximo ';' ou '}' fora de parênteses
    let d = 0, b = a
    for (; b < css.length; b++) {
      const c = css[b]
      if (c === '(') d++
      else if (c === ')') d--
      else if (!d && (c === ';' || c === '}')) break
    }
    const decl = css.slice(a, b)
    const dois = decl.indexOf(':')
    if (dois < 0) { out += css.slice(i, b); i = b; ini.lastIndex = b; continue }
    const prop = decl.slice(0, dois).trim(), val = decl.slice(dois + 1)
    const simples = simplifica(val)
    if (prop.startsWith('--')) {
      // variável: reserva no lugar e a mistura volta dentro de @supports, depois da regra
      const abre = css.lastIndexOf('{', a - 1 < 0 ? 0 : a)
      const antes = css.lastIndexOf('}', abre)
      const seletor = css.slice(antes + 1, abre).trim()
      out += css.slice(i, a) + `${prop}:${simples.trim()}`
      if (seletor && !seletor.startsWith('@')) extras.push(`${SUPORTA}{${seletor}{${prop}:${val.trim()}}}`)
    } else {
      out += css.slice(i, a) + `${prop}:${simples.trim()};${decl.trim()}`
    }
    i = b; ini.lastIndex = b
  }
  out += css.slice(i)
  return out + (extras.length ? '\n' + extras.join('\n') + '\n' : '')
}

// reserva para cqw/cqi: mesma declaração com a unidade trocada, antes da original (fora de variáveis)
export function reservaCq(css, un) {
  return css.replace(/(^|[{;])(\s*)([a-z-]+)\s*:([^;{}]*\d(?:cqw|cqi)\b[^;{}]*)(?=[;}])/g, (t, a, esp, prop, val) => {
    if (/cq[hb]|cqmin|cqmax/.test(val)) return t
    const simples = val.replace(/(-?\d*\.?\d+)(cqw|cqi)\b/g, (_, n) => `calc(${n} * ${un})`)
    return `${a}${esp}${prop}:${simples};${prop}:${val}`
  })
}

const args = process.argv.slice(2)
const cq = (args.find((a) => a.startsWith('--cq=')) || '').slice(5)
for (const arq of args.filter((a) => !a.startsWith('--'))) {
  const txt = readFileSync(arq, 'utf8')
  lerVars(txt)
  let novo
  if (arq.endsWith('.html')) novo = txt.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_, a, css, c) => a + reserva(css) + c)
  else novo = reserva(txt)
  if (cq && !arq.endsWith('.html')) novo = reservaCq(novo, cq)
  const antes = (txt.match(/color-mix\(/g) || []).length
  writeFileSync(arq, novo)
  console.log(`css-reserva: ${arq} — ${antes} color-mix com reserva`)
}
