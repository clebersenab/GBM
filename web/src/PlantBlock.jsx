// Blocos do Início, um para valores e outro para jornadas (nunca juntos).
// Cada bloco: escolher (vários) + um carrossel para cada escolha, na ordem em que foram marcadas.
// Sem nada escolhido, o carrossel mostra a descoberta (Novas sementes / Novas portas).
import { useMemo, useState } from 'react' // eslint-disable-line no-unused-vars
import { useSession } from './session'
import { useLibrary } from './library'
import { useShell } from './Shell'
import Rail from './Rail'
import { Cover, Icon } from './ds'
import { CAMINHOS, TITULOS, VALORES, valorImg, caminhoImg } from './catalog'
import { newDoors, newSeeds, scoreAll } from './recommend'

const MAX = 5
const KIND = {
  valor: {
    list: VALORES, field: 'focus_valores', tfield: 'valores', img: valorImg, tone: 'v', icon: 'sprout', pickIcon: 'star',
    eyebrow: 'Plantar', title: (n) => `Valores para cultivar em ${n}`,
    help: 'Toque nos valores que vocês querem trabalhar. Pode escolher vários.',
    count: (k) => (k ? `${k} em foco` : 'nenhum em foco'),
    disc: 'Novas sementes', discHelp: 'Nenhum valor em foco ainda: uma história de cada valor que não apareceu nas leituras.',
    discover: newSeeds, noteFor: (k) => `Valor: ${k}`,
  },
  caminho: {
    list: CAMINHOS, field: 'focus_caminhos', tfield: 'caminhos', img: caminhoImg, tone: 'j', icon: 'door', pickIcon: 'door',
    eyebrow: 'Apresentar', title: (n) => `Jornadas para apresentar a ${n}`,
    help: 'Toque nas jornadas que vocês querem mostrar. Pode escolher várias.',
    count: (k) => (k ? `${k} ${k === 1 ? 'escolhida' : 'escolhidas'}` : 'nenhuma escolhida'),
    disc: 'Novas portas', discHelp: 'Nenhuma jornada escolhida ainda: uma história de cada jornada que não apareceu nas leituras.',
    discover: newDoors, noteFor: (k) => `Jornada: ${k}`,
  },
}

export default function PlantBlock({ kind }) {
  const K = KIND[kind]
  const { profile, patchProfile } = useSession()
  const { entries, bySlug, signals, signal } = useLibrary()
  const { openTitle } = useShell()
  const [err, setErr] = useState(null)
  const chosen = profile[K.field] || []

  async function toggle(key) {
    setErr(null)
    const on = chosen.includes(key)
    if (!on && chosen.length >= MAX) { setErr(`Até ${MAX}. Desmarque um para escolher outro.`); return }
    if (!on) signal(kind, key)
    try { await patchProfile(profile.id, { [K.field]: on ? chosen.filter((x) => x !== key) : [...chosen, key] }) }
    catch (e) { setErr(e.message) }
  }

  const lists = useMemo(() => {
    const ctx = { entries, profile, signals }
    if (!chosen.length) return { tudo: K.discover(ctx, 7).map((d) => ({ t: d.t, note: K.noteFor(d.key) })) }
    const score = Object.fromEntries(scoreAll(ctx).map((r) => [r.t.id, r.score]))
    const order = (a, b) => (bySlug[a.id]?.status === 'lido') - (bySlug[b.id]?.status === 'lido') || (score[b.id] ?? -9) - (score[a.id] ?? -9)
    const out = {}
    for (const c of chosen) out[c] = TITULOS.filter((t) => t[K.tfield]?.includes(c)).sort(order).map((t) => ({ t }))
    return out
  }, [chosen.join(), entries, signals, bySlug]) // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <section className={`pblock k-${K.tone}`}>
      <header className="pblock-h">
        <div>
          <p className="eyebrow"><Icon name={K.icon} size={13} />{K.eyebrow}</p>
          <h2>{K.title(profile.name)}</h2>
          <p className="muted sm">{K.help}</p>
        </div>
        <span className="pblock-n">{K.count(chosen.length)}</span>
      </header>

      <div className="pick-row">
        {K.list.map((x) => {
          const on = chosen.includes(x)
          return (
            <button key={x} className={`pk${kind === 'caminho' ? ' arch' : ''}${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle(x)}>
              <span className="pk-img"><img src={K.img(x)} alt="" />{on && <i><Icon name="check" size={12} /></i>}</span>
              <span>{x}</span>
            </button>
          )
        })}
      </div>
      {err && <p className="form-error pb-err">{err}</p>}

      {chosen.length ? chosen.map((c) => (
        <div key={c} className="pb-row">
          <h3 className="th-t"><img className={kind === 'caminho' ? 'door-ic' : ''} src={K.img(c)} alt="" />{kind === 'valor' ? `Para cultivar ${c}` : `Apresentando ${c}`}</h3>
          <Rail>{(lists[c] || []).map((r) => <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} onClick={openTitle} />)}</Rail>
        </div>
      )) : (
        <>
          <p className="pb-disc"><Icon name={K.icon} size={15} /><b>{K.disc}</b><span>{K.discHelp}</span></p>
          <Rail>{(lists.tudo || []).map((r) => <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} onClick={openTitle}
            note={<span className={kind === 'valor' ? 'seed-note' : 'door-note'}>{r.note}</span>} />)}</Rail>
        </>
      )}
    </section>
  )
}
