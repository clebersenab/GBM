import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { useSession } from '../session'
import { useLibrary } from '../library'
import { useShell } from '../Shell'
import { Cover, Empty, Icon, Segmented } from '../ds'
import { CAMINHOS, TITULOS, VALORES, valorImg, caminhoImg } from '../catalog'
import { doorsState, scoreAll } from '../recommend'

// Um passo de cada vez, sempre na mesma tela:
// 1. Plantar um valor ou descobrir uma jornada?  2. Qual?  3. Os livros.
// Os passos seguintes ficam apagados até a escolha anterior; mudar um passo limpa os seguintes.
const KIND = {
  valor: { list: VALORES, field: 'valores', focus: 'focus_valores', img: valorImg, tone: 'orange', q: 'Qual valor?', one: 'valor' },
  caminho: { list: CAMINHOS, field: 'caminhos', focus: 'focus_caminhos', img: caminhoImg, tone: 'blue', q: 'Qual jornada?', one: 'jornada' },
}

export default function Cultivar() {
  const { profile, refresh } = useSession()
  const { entries, bySlug, signals, signal } = useLibrary()
  const { openTitle } = useShell()
  const [kind, setKind] = useState(null)
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState('todos')
  const [err, setErr] = useState(null)
  const step2 = useRef(null)
  const step3 = useRef(null)
  const k = kind && KIND[kind]

  const ctx = { entries, profile, signals }
  const scores = useMemo(() => Object.fromEntries(scoreAll(ctx).map((r) => [r.t.id, r.score])), [entries, profile, signals]) // eslint-disable-line react-hooks/exhaustive-deps
  const doors = useMemo(() => Object.fromEntries(doorsState(ctx).map((d) => [d.key, d])), [entries, profile, signals]) // eslint-disable-line react-hooks/exhaustive-deps
  const books = useMemo(() => {
    if (!k || !item) return []
    return TITULOS.filter((t) => t[k.field]?.includes(item))
      .filter((t) => status === 'todos' || (status === 'nao_lidos' ? bySlug[t.id]?.status !== 'lido' : bySlug[t.id]?.status === 'lido'))
      .sort((a, b) => (scores[b.id] ?? -9) - (scores[a.id] ?? -9))
  }, [k, item, status, bySlug, scores])

  const go = (ref) => setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  const pickKind = (v) => { if (v !== kind) { setKind(v); setItem(null); setStatus('todos'); setErr(null) } go(step2) }
  const pickItem = (x) => { setItem(x); setStatus('todos'); setErr(null); signal(kind, x); go(step3) }
  useEffect(() => { setErr(null) }, [item])

  const focus = k && item && (profile[k.focus] || []).includes(item)
  async function toggleFocus() {
    setErr(null)
    const cur = profile[k.focus] || []
    const next = focus ? cur.filter((y) => y !== item) : [...cur, item]
    if (next.length > 3) { setErr(kind === 'valor' ? 'Até 3 valores em foco. Tire um em Editar perfil para incluir outro.' : 'Até 3 jornadas para apresentar. Tire uma em Editar perfil para incluir outra.'); return }
    try { await api(`/profiles/${profile.id}`, { method: 'PATCH', body: { profile: { [k.focus]: next } } }); await refresh() }
    catch (e) { setErr(e.message) }
  }

  return (
    <div className="page steps-page">
      <header className="page-h"><div><h1>Plantar e cultivar</h1><p className="muted">Um passo de cada vez, para encontrar a história certa para {profile.name}.</p></div></header>

      <section className="stp is-on">
        <h2 className="stp-h"><i>1</i>O que vocês querem plantar em {profile.name}?</h2>
        <div className="kinds">
          <Choice on={kind === 'valor'} dim={kind && kind !== 'valor'} tone="orange" img={valorImg('Coragem')} round
            title="Um valor" sub="Fé, coragem, honestidade, amizade… Um valor cresce com várias histórias." onClick={() => pickKind('valor')} />
          <Choice on={kind === 'caminho'} dim={kind && kind !== 'caminho'} tone="blue" img={caminhoImg('Medicina')} arch
            title="Uma jornada" sub="Medicina, empreender, direito, música… Cada jornada é uma porta para o futuro." onClick={() => pickKind('caminho')} />
        </div>
      </section>

      <section ref={step2} className={`stp${kind ? ' is-on' : ''}`} aria-disabled={!kind}>
        <h2 className="stp-h"><i>2</i>{k ? k.q : 'Qual valor ou qual jornada?'}</h2>
        {!k ? <p className="stp-wait">Escolha no passo 1.</p> : (
          <div className="items">
            {k.list.map((x) => {
              const n = TITULOS.filter((t) => t[k.field]?.includes(x)).length
              const opened = kind === 'caminho' && doors[x]?.opened > 0
              const inFocus = (profile[k.focus] || []).includes(x)
              return (
                <Choice key={x} small on={item === x} dim={item && item !== x} tone={k.tone} img={k.img(x)} round={kind === 'valor'} arch={kind === 'caminho'}
                  title={x} sub={`${n} ${n === 1 ? 'livro' : 'livros'}${opened ? ' · porta aberta' : ''}`}
                  badge={inFocus ? (kind === 'valor' ? 'Em foco' : 'Para apresentar') : null} onClick={() => pickItem(x)} />
              )
            })}
          </div>
        )}
      </section>

      <section ref={step3} className={`stp${item ? ' is-on' : ''}`} aria-disabled={!item}>
        <div className="stp-h3">
          <h2 className="stp-h"><i>3</i>{item ? `Livros que ${kind === 'valor' ? 'plantam' : 'abrem a porta de'} ${item}` : 'Os livros'}</h2>
          {item && <Segmented label="Leitura" value={status} onChange={setStatus}
            options={[{ value: 'todos', label: 'Todos' }, { value: 'nao_lidos', label: 'Não lidos' }, { value: 'lidos', label: 'Lidos' }]} />}
        </div>
        {!item ? <p className="stp-wait">Escolha no passo 2.</p> : (
          <>
            <div className={`stp-focus t-${k.tone}`}>
              <span>{kind === 'valor'
                ? <>Quer trabalhar <b>{item}</b> com {profile.name} por um tempo? Em foco, o Início mostra sempre um carrossel deste valor.</>
                : <>Quer apresentar <b>{item}</b> a {profile.name}? O Início vai sugerir a primeira história desta jornada.</>}</span>
              <button className={`btn btn-sm ${focus ? 'btn-ghost' : 'btn-main'}`} onClick={toggleFocus}>
                <Icon name={focus ? 'check' : kind === 'valor' ? 'star' : 'door'} size={16} />
                {kind === 'valor' ? (focus ? 'Em foco' : 'Colocar em foco') : (focus ? 'Vamos apresentar' : 'Apresentar')}
              </button>
            </div>
            {err && <p className="form-error">{err}</p>}
            {books.length ? (
              <div className="cover-grid">{books.map((t) => <Cover key={t.id} t={t} status={bySlug[t.id]?.status} onClick={openTitle} />)}</div>
            ) : <Empty icon="search" title="Nenhum livro neste filtro" />}
          </>
        )}
      </section>
    </div>
  )
}

function Choice({ on, dim, tone, img, round, arch, title, sub, badge, small, onClick }) {
  return (
    <button className={`choice t-${tone}${on ? ' on' : ''}${dim ? ' dim' : ''}${small ? ' sm' : ''}`} aria-pressed={!!on} onClick={onClick}>
      <img src={img} alt="" className={round ? 'round' : arch ? 'arch' : ''} />
      <span className="choice-t"><b>{title}</b><small>{sub}</small>{badge && <span className="choice-b">{badge}</span>}</span>
      {on && <i className="choice-ok"><Icon name="check" size={14} /></i>}
    </button>
  )
}
