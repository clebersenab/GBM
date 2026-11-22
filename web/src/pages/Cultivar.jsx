import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useSession } from '../session'
import { useLibrary } from '../library'
import { useShell } from '../Shell'
import { Card, Cover, Empty, Icon, PageHead, Segmented, Tag } from '../ds'
import { CAMINHOS, TITULOS, VALORES, valorImg, caminhoImg } from '../catalog'
import { doorsState, scoreAll } from '../recommend'

// Valores se cultivam (repetição, "em foco"); jornadas se descobrem (uma porta de cada vez, "apresentar").
const KIND = {
  valor: { list: VALORES, field: 'valores', focus: 'focus_valores', img: valorImg, tone: 'orange' },
  caminho: { list: CAMINHOS, field: 'caminhos', focus: 'focus_caminhos', img: caminhoImg, tone: 'blue' },
}

export default function Cultivar() {
  const { profile, refresh } = useSession()
  const { entries, bySlug, signals, signal } = useLibrary()
  const { openTitle } = useShell()
  const [params, setParams] = useSearchParams()
  const kind = KIND[params.get('tipo')] ? params.get('tipo') : null // sem escolha padrão
  const [sel, setSel] = useState([])
  const [status, setStatus] = useState('todos')
  const [err, setErr] = useState(null)
  const k = kind && KIND[kind]

  const ctx = { entries, profile, signals }
  const scores = useMemo(() => Object.fromEntries(scoreAll(ctx).map((r) => [r.t.id, r.score])), [entries, profile, signals]) // eslint-disable-line react-hooks/exhaustive-deps
  const doors = useMemo(() => Object.fromEntries(doorsState(ctx).map((d) => [d.key, d])), [entries, profile, signals]) // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => {
    if (!k || !sel.length) return []
    return TITULOS.map((t) => ({ t, hits: sel.filter((x) => t[k.field]?.includes(x)).length }))
      .filter((r) => r.hits > 0)
      .filter((r) => status === 'todos' || (status === 'nao_lidos' ? bySlug[r.t.id]?.status !== 'lido' : bySlug[r.t.id]?.status === 'lido'))
      .sort((a, b) => b.hits - a.hits || (scores[b.t.id] ?? -9) - (scores[a.t.id] ?? -9))
  }, [sel, k, status, bySlug, scores])

  const choose = (v) => { setSel([]); setErr(null); setParams({ tipo: v }) }
  const toggle = (x) => {
    setSel((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]))
    if (!sel.includes(x)) signal(kind, x)
  }
  async function toggleFocus(x) {
    setErr(null)
    const cur = profile[k.focus] || []
    const next = cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]
    if (next.length > 3) { setErr(kind === 'valor' ? 'Até 3 valores em foco. Tire um para incluir outro.' : 'Até 3 jornadas para apresentar. Tire uma para incluir outra.'); return }
    try {
      await api(`/profiles/${profile.id}`, { method: 'PATCH', body: { profile: { [k.focus]: next } } })
      await refresh()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="page">
      <PageHead title="Plantar e cultivar" sub={`O que vocês querem plantar em ${profile.name}?`} />

      {!kind ? (
        <div className="picks">
          <button className="pick v" onClick={() => choose('valor')}>
            <img src={valorImg('Fé')} alt="" />
            <span><b>Cultivar um valor</b><small>Fé, coragem, honestidade, amizade e outros. Um valor cresce com várias histórias sobre ele.</small><em>Ver os valores <Icon name="chev" size={16} /></em></span>
          </button>
          <button className="pick j" onClick={() => choose('caminho')}>
            <img src={caminhoImg('Empreender')} alt="" />
            <span><b>Descobrir uma jornada</b><small>Empreender, medicina, direito, música e outras. Cada jornada é uma porta para o futuro.</small><em>Ver as jornadas <Icon name="chev" size={16} /></em></span>
          </button>
        </div>
      ) : (
        <>
          <Segmented label="Tipo" value={kind} onChange={choose}
            options={[{ value: 'valor', label: 'Cultivar um valor' }, { value: 'caminho', label: 'Descobrir uma jornada' }]} />
          <p className="muted kind-hint">{kind === 'valor'
            ? <>Toque nos valores para ver os livros. Use <b>Focar</b> para o Início trazer sempre um carrossel daquele valor.</>
            : <>Toque nas jornadas para ver os livros. Use <b>Apresentar</b> para o Início sugerir a primeira história daquela porta. Uma porta fica <b>aberta</b> quando {profile.name} lê um livro da jornada.</>}</p>

          <div className={`opt-grid${kind === 'caminho' ? ' is-doors' : ''}`}>
            {k.list.map((x) => {
              const on = sel.includes(x)
              const focus = (profile[k.focus] || []).includes(x)
              const n = TITULOS.filter((t) => t[k.field]?.includes(x)).length
              const d = doors[x]
              return (
                <div key={x} className={`opt t-${k.tone}${on ? ' on' : ''}`}>
                  <button className="opt-main" aria-pressed={on} onClick={() => toggle(x)}>
                    <img src={k.img(x)} alt="" />
                    <b>{x}</b>
                    <small>{kind === 'caminho' && d?.opened ? `Porta aberta · ${n} livros` : `${n} ${n === 1 ? 'livro' : 'livros'}`}</small>
                    {on && <i className="opt-ok"><Icon name="check" size={14} /></i>}
                    {kind === 'caminho' && d?.opened > 0 && <i className="opt-open">Aberta</i>}
                  </button>
                  <button className={`opt-star${focus ? ' on' : ''}`} onClick={() => toggleFocus(x)} aria-pressed={focus}
                    title={kind === 'valor' ? (focus ? 'Tirar do foco' : 'Focar: o Início mostra sempre um carrossel deste valor') : (focus ? 'Não apresentar agora' : 'Apresentar: o Início sugere a primeira história desta jornada')}>
                    <Icon name={kind === 'valor' ? 'star' : 'door'} size={15} />
                    {kind === 'valor' ? (focus ? 'Em foco' : 'Focar') : (focus ? 'Vamos apresentar' : 'Apresentar')}
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
              <Empty icon={kind === 'valor' ? 'sprout' : 'door'} title={kind === 'valor' ? 'Escolha um ou mais valores acima' : 'Escolha uma ou mais jornadas acima'} />
            ) : results.length ? (
              <div className="cover-grid in-card">
                {results.map((r) => <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} onClick={openTitle}
                  note={sel.length > 1 && r.hits > 1 ? `${r.hits} de ${sel.length} escolhidos` : null} />)}
              </div>
            ) : <Empty icon="search" title="Nenhum livro neste filtro" />}
          </Card>
        </>
      )}

      {(profile.focus_valores?.length > 0 || profile.focus_caminhos?.length > 0) && (
        <div className="focus-sum">
          <p className="muted sm focus-line">Valores em foco: {profile.focus_valores.length ? profile.focus_valores.map((x) => <Tag key={x} tone="orange" icon="star">{x}</Tag>) : <span>nenhum</span>}</p>
          <p className="muted sm focus-line">Jornadas para apresentar: {profile.focus_caminhos.length ? profile.focus_caminhos.map((x) => <Tag key={x} tone="blue" icon="door">{x}</Tag>) : <span>nenhuma</span>}</p>
        </div>
      )}
    </div>
  )
}
