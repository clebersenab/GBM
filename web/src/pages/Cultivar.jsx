import { useMemo, useState } from 'react'
import { api } from '../api'
import { useSession } from '../session'
import { useLibrary } from '../library'
import { useShell } from '../Shell'
import { Card, Cover, Empty, Icon, PageHead, Segmented, Tag } from '../ds'
import { CAMINHOS, TITULOS, VALORES, valorImg, caminhoImg } from '../catalog'
import { scoreAll } from '../recommend'

const KIND = {
  valor: { list: VALORES, field: 'valores', focus: 'focus_valores', img: valorImg, tone: 'orange', verb: 'Cultivar um valor' },
  caminho: { list: CAMINHOS, field: 'caminhos', focus: 'focus_caminhos', img: caminhoImg, tone: 'blue', verb: 'Descobrir uma jornada' },
}

export default function Cultivar() {
  const { profile, refresh } = useSession()
  const { entries, bySlug, signals, signal } = useLibrary()
  const { openTitle } = useShell()
  const [kind, setKind] = useState('valor')
  const [sel, setSel] = useState([])
  const [status, setStatus] = useState('todos')
  const [err, setErr] = useState(null)
  const k = KIND[kind]

  const scores = useMemo(() => Object.fromEntries(scoreAll({ entries, profile, signals }).map((r) => [r.t.id, r.score])), [entries, profile, signals])
  const results = useMemo(() => {
    if (!sel.length) return []
    return TITULOS.map((t) => ({ t, hits: sel.filter((x) => t[k.field]?.includes(x)).length }))
      .filter((r) => r.hits > 0)
      .filter((r) => status === 'todos' || (status === 'nao_lidos' ? bySlug[r.t.id]?.status !== 'lido' : bySlug[r.t.id]?.status === 'lido'))
      .sort((a, b) => b.hits - a.hits || (scores[b.t.id] ?? -9) - (scores[a.t.id] ?? -9))
  }, [sel, k, status, bySlug, scores])

  const toggle = (x) => {
    setSel((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]))
    if (!sel.includes(x)) signal(kind, x)
  }
  const switchKind = (v) => { setKind(v); setSel([]) }

  async function toggleFocus(x) {
    setErr(null)
    const cur = profile[k.focus] || []
    const next = cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]
    if (next.length > 3) { setErr('Escolha até 3 em foco. Tire um para incluir outro.'); return }
    try {
      await api(`/profiles/${profile.id}`, { method: 'PATCH', body: { profile: { [k.focus]: next } } })
      await refresh()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="page">
      <PageHead title="Plantar e cultivar" sub={`Escolha o que vocês querem trabalhar com ${profile.name} e veja os livros que plantam isso`} />
      <Segmented label="Tipo" value={kind} onChange={switchKind}
        options={[{ value: 'valor', label: 'Valores', count: VALORES.length }, { value: 'caminho', label: 'Jornadas', count: CAMINHOS.length }]} />

      <div className="opt-grid">
        {k.list.map((x) => {
          const on = sel.includes(x)
          const focus = (profile[k.focus] || []).includes(x)
          const n = TITULOS.filter((t) => t[k.field]?.includes(x)).length
          return (
            <div key={x} className={`opt t-${k.tone}${on ? ' on' : ''}`}>
              <button className="opt-main" aria-pressed={on} onClick={() => toggle(x)}>
                <img src={k.img(x)} alt="" />
                <b>{x}</b>
                <small>{n} {n === 1 ? 'livro' : 'livros'}</small>
                {on && <i className="opt-ok"><Icon name="check" size={14} /></i>}
              </button>
              <button className={`opt-star${focus ? ' on' : ''}`} onClick={() => toggleFocus(x)} aria-pressed={focus}
                title={focus ? 'Tirar do foco deste perfil' : 'Colocar em foco: vira um carrossel no Início'}>
                <Icon name="star" size={15} />{focus ? 'Em foco' : 'Focar'}
              </button>
            </div>
          )
        })}
      </div>
      {err && <p className="form-error">{err}</p>}

      <Card title={sel.length ? `${results.length} ${results.length === 1 ? 'livro' : 'livros'} para ${sel.join(' + ')}` : 'Livros'}
        sub={sel.length ? 'Primeiro os que trabalham mais do que vocês escolheram; depois, os mais a cara do perfil' : null}
        action={sel.length > 0 && <Segmented label="Leitura" value={status} onChange={setStatus}
          options={[{ value: 'todos', label: 'Todos' }, { value: 'nao_lidos', label: 'Não lidos' }, { value: 'lidos', label: 'Lidos' }]} />}>
        {!sel.length ? (
          <Empty icon="sprout" title={`${k.verb}`}>Toque em um ou mais cartões acima. Use “Focar” para o Início sempre mostrar um carrossel daquele tema.</Empty>
        ) : results.length ? (
          <div className="cover-grid in-card">
            {results.map((r) => <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} onClick={openTitle}
              note={sel.length > 1 && r.hits > 1 ? `${r.hits} de ${sel.length} escolhidos` : null} />)}
          </div>
        ) : <Empty icon="search" title="Nenhum livro neste filtro" />}
      </Card>
      {(profile.focus_valores?.length > 0 || profile.focus_caminhos?.length > 0) && (
        <p className="muted sm focus-line">Em foco para {profile.name}: {[...profile.focus_valores, ...profile.focus_caminhos].map((x) => <Tag key={x} tone="orange" icon="star">{x}</Tag>)}</p>
      )}
    </div>
  )
}
