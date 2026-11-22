import { useMemo, useState } from 'react'
import { api } from '../api'
import { useSession } from '../session'
import { useLibrary } from '../library'
import { useShell } from '../Shell'
import { Card, Cover, Empty, Icon, PageHead, Segmented, Tag } from '../ds'
import { CAMINHOS, TITULOS, VALORES, valorImg, caminhoImg } from '../catalog'
import { doorsState, scoreAll } from '../recommend'

// Uma única visão: valores e jornadas lado a lado, alternados, com o mesmo tamanho e o mesmo gesto.
// O que muda é só o controle de cada um: valor se cultiva (Focar); jornada se descobre (Apresentar).
const TYPE = {
  valor: { field: 'valores', focus: 'focus_valores', img: valorImg, tone: 'orange', label: 'Valor', icon: 'sprout' },
  caminho: { field: 'caminhos', focus: 'focus_caminhos', img: caminhoImg, tone: 'blue', label: 'Jornada', icon: 'door' },
}
const ITEMS = []
for (let i = 0; i < Math.max(VALORES.length, CAMINHOS.length); i++) {
  if (VALORES[i]) ITEMS.push({ kind: 'valor', key: VALORES[i] })
  if (CAMINHOS[i]) ITEMS.push({ kind: 'caminho', key: CAMINHOS[i] })
}
const id = (it) => it.kind + ':' + it.key

export default function Cultivar() {
  const { profile, refresh } = useSession()
  const { entries, bySlug, signals, signal } = useLibrary()
  const { openTitle } = useShell()
  const [sel, setSel] = useState([])
  const [status, setStatus] = useState('todos')
  const [err, setErr] = useState(null)

  const ctx = { entries, profile, signals }
  const scores = useMemo(() => Object.fromEntries(scoreAll(ctx).map((r) => [r.t.id, r.score])), [entries, profile, signals]) // eslint-disable-line react-hooks/exhaustive-deps
  const doors = useMemo(() => Object.fromEntries(doorsState(ctx).map((d) => [d.key, d])), [entries, profile, signals]) // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => {
    if (!sel.length) return []
    return TITULOS.map((t) => ({ t, hits: sel.filter((s) => t[TYPE[s.kind].field]?.includes(s.key)).length }))
      .filter((r) => r.hits > 0)
      .filter((r) => status === 'todos' || (status === 'nao_lidos' ? bySlug[r.t.id]?.status !== 'lido' : bySlug[r.t.id]?.status === 'lido'))
      .sort((a, b) => b.hits - a.hits || (scores[b.t.id] ?? -9) - (scores[a.t.id] ?? -9))
  }, [sel, status, bySlug, scores])

  const isOn = (it) => sel.some((s) => id(s) === id(it))
  const toggle = (it) => {
    if (isOn(it)) setSel((s) => s.filter((x) => id(x) !== id(it)))
    else { setSel((s) => [...s, it]); signal(it.kind, it.key) }
  }
  async function toggleFocus(it) {
    setErr(null)
    const f = TYPE[it.kind].focus
    const cur = profile[f] || []
    const next = cur.includes(it.key) ? cur.filter((y) => y !== it.key) : [...cur, it.key]
    if (next.length > 3) { setErr(it.kind === 'valor' ? 'Até 3 valores em foco. Tire um para incluir outro.' : 'Até 3 jornadas para apresentar. Tire uma para incluir outra.'); return }
    try {
      await api(`/profiles/${profile.id}`, { method: 'PATCH', body: { profile: { [f]: next } } })
      await refresh()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="page">
      <PageHead title="Plantar e cultivar" sub={`Valores para cultivar e jornadas para descobrir com ${profile.name}. Escolha quantos quiser, dos dois.`} />

      <div className="legend">
        <span className="lg v"><i><Icon name="sprout" size={16} /></i><span><b>Valor</b> cresce com várias histórias. <em><Icon name="star" size={13} />Focar</em> deixa um carrossel dele no Início.</span></span>
        <span className="lg j"><i><Icon name="door" size={16} /></i><span><b>Jornada</b> é uma porta para o futuro. <em><Icon name="door" size={13} />Apresentar</em> sugere a primeira história no Início.</span></span>
      </div>

      <div className="seeds">
        {ITEMS.map((it) => {
          const T = TYPE[it.kind]
          const on = isOn(it)
          const focus = (profile[T.focus] || []).includes(it.key)
          const n = TITULOS.filter((t) => t[T.field]?.includes(it.key)).length
          const opened = it.kind === 'caminho' && doors[it.key]?.opened > 0
          return (
            <div key={id(it)} className={`seed k-${it.kind} t-${T.tone}${on ? ' on' : ''}`}>
              <button className="seed-main" aria-pressed={on} onClick={() => toggle(it)}>
                <span className="seed-k">{T.label}</span>
                {on && <i className="opt-ok"><Icon name="check" size={14} /></i>}
                <img src={T.img(it.key)} alt="" />
                <b>{it.key}</b>
                <small>{n} {n === 1 ? 'livro' : 'livros'}{it.kind === 'caminho' && (opened ? ' · porta aberta' : ' · porta fechada')}</small>
              </button>
              <button className={`seed-f${focus ? ' on' : ''}`} onClick={() => toggleFocus(it)} aria-pressed={focus}>
                <Icon name={it.kind === 'valor' ? 'star' : 'door'} size={15} />
                {it.kind === 'valor' ? (focus ? 'Em foco' : 'Focar') : (focus ? 'Vamos apresentar' : 'Apresentar')}
              </button>
            </div>
          )
        })}
      </div>
      {err && <p className="form-error">{err}</p>}

      <Card title={sel.length ? `${results.length} ${results.length === 1 ? 'livro' : 'livros'}` : 'Livros'}
        sub={sel.length ? <span className="sel-chips">{sel.map((s) => (
          <button key={id(s)} className={`tag t-${TYPE[s.kind].tone}`} onClick={() => toggle(s)} aria-label={`Tirar ${s.key}`}>
            <Icon name={TYPE[s.kind].icon} size={13} />{s.key}<Icon name="x" size={12} /></button>
        ))}</span> : null}
        action={sel.length > 0 && <Segmented label="Leitura" value={status} onChange={setStatus}
          options={[{ value: 'todos', label: 'Todos' }, { value: 'nao_lidos', label: 'Não lidos' }, { value: 'lidos', label: 'Lidos' }]} />}>
        {!sel.length ? (
          <Empty icon="sprout" title="Toque em valores, jornadas ou nos dois">Os livros que trabalham mais do que vocês escolheram aparecem primeiro.</Empty>
        ) : results.length ? (
          <div className="cover-grid in-card">
            {results.map((r) => <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} onClick={openTitle}
              note={sel.length > 1 && r.hits > 1 ? `${r.hits} de ${sel.length} escolhidos` : null} />)}
          </div>
        ) : <Empty icon="search" title="Nenhum livro neste filtro" />}
      </Card>

      <div className="focus-sum">
        <p className="muted sm focus-line">Valores em foco: {profile.focus_valores?.length ? profile.focus_valores.map((x) => <Tag key={x} tone="orange" icon="star">{x}</Tag>) : <span>nenhum</span>}</p>
        <p className="muted sm focus-line">Jornadas para apresentar: {profile.focus_caminhos?.length ? profile.focus_caminhos.map((x) => <Tag key={x} tone="blue" icon="door">{x}</Tag>) : <span>nenhuma</span>}</p>
      </div>
    </div>
  )
}
