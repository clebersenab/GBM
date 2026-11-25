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

// troca todos os color-mix(...) de um valor pela cor de maior peso (dos mais internos para fora)
export function simplifica(v) {
  for (let guarda = 0; guarda < 50; guarda++) {
    const i = v.lastIndexOf('color-mix(')
    if (i < 0) return v
    const a = i + 'color-mix'.length, f = fecha(v, a)
    if (f < 0) return v
    const [, x, y] = partes(v.slice(a + 1, f))
    const c1 = corPeso(x), c2 = corPeso(y || 'transparent')
    const p1 = c1.p ?? (c2.p != null ? 100 - c2.p : 50)
    v = v.slice(0, i) + (p1 >= 50 ? c1.cor : c2.cor) + v.slice(f + 1)
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
  let novo
  if (arq.endsWith('.html')) novo = txt.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_, a, css, c) => a + reserva(css) + c)
  else novo = reserva(txt)
  if (cq && !arq.endsWith('.html')) novo = reservaCq(novo, cq)
  const antes = (txt.match(/color-mix\(/g) || []).length
  writeFileSync(arq, novo)
  console.log(`css-reserva: ${arq} — ${antes} color-mix com reserva`)
}
