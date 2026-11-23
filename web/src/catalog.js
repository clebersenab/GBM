// Catálogo e utilidades compartilhadas.
// O catálogo mora no banco e chega por GET /catalog. Para abrir na hora, a plataforma começa
// com a última versão guardada no aparelho (ou com o arquivo embutido) e troca quando a API responde.
// As exportações são "let": quem importa enxerga sempre a versão atual.
import embutido from '../../data/catalogo.json'
import { api } from './api'

const CACHE = 'gbm-catalogo'
export let TITULOS, VALORES, CAMINHOS, GRUPOS, GRUPOS_TODOS, FILEIRAS, CATEGORIAS, LANCAMENTOS, byId, grupoById
let atual = ''

function aplicar(c) {
  TITULOS = c.titulos
  VALORES = c.valores
  CAMINHOS = c.caminhos
  GRUPOS_TODOS = c.grupos
  // Para as famílias, só grupos com algum livro (o cadastro usa GRUPOS_TODOS).
  GRUPOS = c.grupos.filter((g) => g.titulos.length > 0)
  FILEIRAS = c.fileiras_landing
  // Todas as categorias que existem nos livros: primeiro as da landing, depois as demais.
  CATEGORIAS = [...new Set([...c.fileiras_landing, ...c.titulos.flatMap((t) => t.fileiras || [])])]
  LANCAMENTOS = c.lancamentos_ordem
  byId = Object.fromEntries(TITULOS.map((t) => [t.id, t]))
  grupoById = Object.fromEntries(GRUPOS_TODOS.map((g) => [g.id, g]))
}

function guardado() {
  try { const s = localStorage.getItem(CACHE); return s ? JSON.parse(s) : null } catch { return null }
}
const inicial = guardado()
aplicar(inicial?.titulos ? inicial : embutido)
atual = JSON.stringify(inicial?.titulos ? inicial : embutido)

// Busca o catálogo na API; devolve true se mudou (aí a tela precisa redesenhar).
export async function atualizarCatalogo() {
  const c = await api('/catalog')
  if (!c?.titulos) return false
  const txt = JSON.stringify(c)
  if (txt === atual) return false
  try { localStorage.setItem(CACHE, txt) } catch { /* sem storage */ }
  atual = txt
  aplicar(c)
  return true
}
// Lançamentos com ilustração larga em images/destaques (usada no banner do Início).
export const DESTAQUE_IMG = new Set(['moby-dick', 'ze-candeia', 'a-banda-da-garagem', 'a-ilha-das-regras', 'a-turma-do-mucuripe', 'bentinho-e-capitu', 'lia-e-o-julgamento'])

// minúsculas e sem acento: "Fé" -> "fe"
export const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
// Miniatura leve para listas e carrosséis (gerada por scripts/thumbs.py); a original fica para telas grandes.
// Endereço de uma imagem: as do site começam em images/, as enviadas pelo cadastro já vêm com o endereço completo da API.
export const src = (p) => (!p ? '' : /^(https?:)?\/\//.test(p) || p.startsWith('/') ? p : '/' + p)
export const thumb = (p) => (/^https?:/.test(p || '') ? p : '/' + (p || '').replace(/^images\/(capas|cards|boxes)\//, 'images/t/$1/'))
export const valorImg = (v) => `/images/t/cards/valor-${slug(v)}.webp`
export const caminhoImg = (c) => `/images/t/cards/caminho-${slug(c)}.webp`
export const avatarImg = (a) => `/images/avatares/avatar-${a}.webp`

// Box de um título e a posição dele na ordem de leitura.
export function boxOf(t) {
  const g = t.box && grupoById[t.box]
  if (!g) return null
  return { grupo: g, index: g.titulos.indexOf(t.id), total: g.titulos.length }
}
