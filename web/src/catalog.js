// Catálogo e utilidades compartilhadas (dados em data/catalogo.json).
import catalogo from '../../data/catalogo.json'

export const TITULOS = catalogo.titulos
export const VALORES = catalogo.valores
export const CAMINHOS = catalogo.caminhos
export const GRUPOS = catalogo.grupos
export const FILEIRAS = catalogo.fileiras_landing
// Todas as categorias que existem nos livros: primeiro as da landing, depois as demais.
export const CATEGORIAS = [...new Set([...catalogo.fileiras_landing, ...catalogo.titulos.flatMap((t) => t.fileiras || [])])]
export const LANCAMENTOS = catalogo.lancamentos_ordem
// Lançamentos com ilustração larga em images/destaques (usada no banner do Início).
export const DESTAQUE_IMG = new Set(['moby-dick', 'ze-candeia', 'a-banda-da-garagem', 'a-ilha-das-regras', 'a-turma-do-mucuripe', 'bentinho-e-capitu', 'lia-e-o-julgamento'])
export const byId = Object.fromEntries(TITULOS.map((t) => [t.id, t]))
export const grupoById = Object.fromEntries(GRUPOS.map((g) => [g.id, g]))

// minúsculas e sem acento: "Fé" -> "fe"
export const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
// Miniatura leve para listas e carrosséis (gerada por scripts/thumbs.py); a original fica para telas grandes.
export const thumb = (p) => '/' + (p || '').replace(/^images\/(capas|cards|boxes)\//, 'images/t/$1/')
export const valorImg = (v) => `/images/t/cards/valor-${slug(v)}.webp`
export const caminhoImg = (c) => `/images/t/cards/caminho-${slug(c)}.webp`
export const avatarImg = (a) => `/images/avatares/avatar-${a}.webp`

// Box de um título e a posição dele na ordem de leitura.
export function boxOf(t) {
  const g = t.box && grupoById[t.box]
  if (!g) return null
  return { grupo: g, index: g.titulos.indexOf(t.id), total: g.titulos.length }
}
