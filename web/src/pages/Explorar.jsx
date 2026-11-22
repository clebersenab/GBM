import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLibrary } from '../library'
import { useShell } from '../Shell'
import Rail from '../Rail'
import { Card, Cover, Empty, PageHead, Tag } from '../ds'
import { FILEIRAS, GRUPOS, LANCAMENTOS, TITULOS, byId } from '../catalog'
import { search } from '../search'

export default function Explorar() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const { bySlug } = useLibrary()
  const { openTitle } = useShell()
  const results = useMemo(() => (q ? search(q, 60) : null), [q])

  const rows = useMemo(() => [
    { nome: 'Lançamentos', itens: LANCAMENTOS.map((id) => byId[id]).filter(Boolean) },
    ...FILEIRAS.map((nome) => ({ nome, itens: TITULOS.filter((t) => t.fileiras?.includes(nome)) })),
  ], [])

  if (results) {
    return (
      <div className="page">
        <PageHead title={`Resultados para “${q}”`} sub={`${results.length} ${results.length === 1 ? 'livro encontrado' : 'livros encontrados'}, do mais provável ao menos provável`} />
        {results.length ? (
          <div className="cover-grid">
            {results.map((r) => <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} note={`Achado em: ${r.why}`} onClick={openTitle} />)}
          </div>
        ) : <Card><Empty icon="search" title="Nada encontrado">Tente o nome da obra original, um valor ou uma palavra da história.</Empty></Card>}
      </div>
    )
  }

  return (
    <div className="page">
      <PageHead title="Explorar" sub={`${TITULOS.length} livros, das grandes obras às histórias de fé`} />
      {rows.map((r) => (
        <Card key={r.nome} title={r.nome} pad={false}>
          <Rail>{r.itens.map((t) => <Cover key={t.id} t={t} status={bySlug[t.id]?.status} onClick={openTitle} />)}</Rail>
        </Card>
      ))}
      <Card title="Boxes e coleções" sub="Histórias em volumes e autores reunidos" pad={false}>
        <Rail>
          {GRUPOS.map((g) => (
            <button key={g.id} className="grp" onClick={() => openTitle(byId[g.titulos[0]])}>
              <img loading="lazy" src={`/${g.arte}`} alt="" />
              <span><Tag tone={g.tipo === 'box' ? 'purple' : 'blue'}>{g.tipo === 'box' ? `Box · ${g.titulos.length} volumes` : 'Coleção'}</Tag><b>{g.titulo}</b></span>
            </button>
          ))}
        </Rail>
      </Card>
    </div>
  )
}
