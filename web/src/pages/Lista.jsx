import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLibrary } from '../library'
import { useShell } from '../Shell'
import { Card, Cover, Empty, PageHead, Segmented } from '../ds'
import { byId } from '../catalog'
import { quando } from './Inicio'

const FILTERS = [['todos', 'Todos'], ['quero_ler', 'Quero ler'], ['lendo', 'Lendo'], ['lido', 'Lidos']]

export default function Lista() {
  const { entries } = useLibrary()
  const { openTitle } = useShell()
  const [params, setParams] = useSearchParams()
  const f = params.get('f') || 'todos'
  const [sort, setSort] = useState('recentes')

  const list = useMemo(() => {
    const l = entries.filter((e) => byId[e.slug] && (f === 'todos' || e.status === f))
    return sort === 'az' ? [...l].sort((a, b) => byId[a.slug].titulo.localeCompare(byId[b.slug].titulo)) : l
  }, [entries, f, sort])
  const count = (k) => (k === 'todos' ? entries.length : entries.filter((e) => e.status === k).length)

  return (
    <div className="page">
      <PageHead title="Minha lista" sub="Os livros que vocês marcaram, com o que já foi lido e o que está em andamento">
        <label className="select"><span>Ordenar</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recentes">Mais recentes</option><option value="az">De A a Z</option>
          </select>
        </label>
      </PageHead>
      <Segmented label="Filtrar" value={f} onChange={(v) => setParams(v === 'todos' ? {} : { f: v })}
        options={FILTERS.map(([value, label]) => ({ value, label, count: count(value) }))} />
      {list.length ? (
        <div className="cover-grid">
          {list.map((e) => <Cover key={e.slug} t={byId[e.slug]} status={e.status} note={quando(e.updated_at)} onClick={openTitle} />)}
        </div>
      ) : (
        <Card><Empty icon="bookmark" title={f === 'todos' ? 'A lista está vazia' : 'Nenhum livro neste filtro'}
          action={<Link className="btn btn-main" to="/explorar">Explorar o catálogo</Link>}>
          Abra um livro e toque em “Quero ler” para guardar aqui.
        </Empty></Card>
      )}
    </div>
  )
}
