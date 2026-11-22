// "O que vocês estão plantando": escolha e resultado no mesmo lugar do Início.
// Em cima, duas fileiras para marcar (vários valores em foco, várias jornadas para apresentar).
// Embaixo, UM carrossel com abas: Tudo + uma aba por escolha. Assim várias escolhas não
// viram vários carrosséis. Tipo sem escolha mostra a descoberta (Novas sementes / Novas portas).
import { useMemo, useState } from 'react'
import { useSession } from './session'
import { useLibrary } from './library'
import { useShell } from './Shell'
import Rail from './Rail'
import { Cover, Icon } from './ds'
import { CAMINHOS, TITULOS, VALORES, valorImg, caminhoImg } from './catalog'
import { newDoors, newSeeds, scoreAll } from './recommend'

const MAX = 5

export default function PlantBlock() {
  const { profile, patchProfile } = useSession()
  const { entries, bySlug, signals, signal } = useLibrary()
  const { openTitle } = useShell()
  const [tab, setTab] = useState('tudo')
  const [err, setErr] = useState(null)
  const fv = profile.focus_valores || []
  const fc = profile.focus_caminhos || []
  const ctx = { entries, profile, signals }

  async function toggle(kind, key) {
    setErr(null)
    const field = kind === 'valor' ? 'focus_valores' : 'focus_caminhos'
    const cur = profile[field] || []
    const on = cur.includes(key)
    if (!on && cur.length >= MAX) { setErr(`Até ${MAX} ${kind === 'valor' ? 'valores' : 'jornadas'}. Desmarque um para escolher outro.`); return }
    if (!on) signal(kind, key)
    if (on && tab === kind + ':' + key) setTab('tudo')
    try { await patchProfile(profile.id, { [field]: on ? cur.filter((x) => x !== key) : [...cur, key] }) }
    catch (e) { setErr(e.message) }
  }

  // Abas e livros de cada aba
  const { tabs, lists } = useMemo(() => {
    const score = Object.fromEntries(scoreAll(ctx).map((r) => [r.t.id, r.score]))
    const unreadFirst = (a, b) => (bySlug[a.id]?.status === 'lido') - (bySlug[b.id]?.status === 'lido') || (score[b.id] ?? -9) - (score[a.id] ?? -9)
    const tabs = [], lists = {}
    for (const v of fv) { const id = 'valor:' + v; tabs.push({ id, label: v, kind: 'valor' }); lists[id] = TITULOS.filter((t) => t.valores?.includes(v)).sort(unreadFirst).map((t) => ({ t })) }
    if (!fv.length) { const s = newSeeds(ctx, 7); if (s.length) { tabs.push({ id: 'sementes', label: 'Novas sementes', kind: 'valor', discover: true }); lists.sementes = s.map((d) => ({ t: d.t, note: `Valor: ${d.key}`, kind: 'valor' })) } }
    for (const c of fc) { const id = 'caminho:' + c; tabs.push({ id, label: c, kind: 'caminho' }); lists[id] = TITULOS.filter((t) => t.caminhos?.includes(c)).sort(unreadFirst).map((t) => ({ t })) }
    if (!fc.length) { const d = newDoors(ctx, 6); if (d.length) { tabs.push({ id: 'portas', label: 'Novas portas', kind: 'caminho', discover: true }); lists.portas = d.map((x) => ({ t: x.t, note: `Jornada: ${x.key}`, kind: 'caminho' })) } }
    // Tudo: livros que tocam mais escolhas primeiro; depois a descoberta, intercalada.
    const chosen = TITULOS.map((t) => ({ t, hits: fv.filter((v) => t.valores?.includes(v)).length + fc.filter((c) => t.caminhos?.includes(c)).length }))
      .filter((r) => r.hits > 0).sort((a, b) => b.hits - a.hits || unreadFirst(a.t, b.t))
      .map((r) => ({ t: r.t, note: r.hits > 1 ? `${r.hits} escolhas` : null }))
    const disc = []
    const a = lists.sementes || [], b = lists.portas || []
    for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) disc.push(a[i]); if (b[i]) disc.push(b[i]) }
    const seen = new Set()
    lists.tudo = [...chosen, ...disc].filter((r) => !seen.has(r.t.id) && seen.add(r.t.id)).slice(0, 24)
    return { tabs, lists }
  }, [fv.join(), fc.join(), entries, signals, bySlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = lists[tab] ? tab : 'tudo'
  const rows = lists[active] || []
  const nothing = !fv.length && !fc.length

  return (
    <section className="plant-block" id="plantar">
      <header className="pb-h">
        <div>
          <p className="eyebrow">O que vocês estão plantando</p>
          <h2>Em {profile.name}</h2>
        </div>
        <p className="muted sm pb-help">Toque para escolher. Pode marcar vários de cada.</p>
      </header>

      <div className="pickers">
        <div className="picker v">
          <h3><Icon name="star" size={15} />Valores para cultivar <small>{fv.length ? `${fv.length} em foco` : 'nenhum em foco'}</small></h3>
          <div className="pick-row">
            {VALORES.map((v) => {
              const on = fv.includes(v)
              return (
                <button key={v} className={`pk${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle('valor', v)}>
                  <span className="pk-img"><img src={valorImg(v)} alt="" />{on && <i><Icon name="check" size={12} /></i>}</span>
                  <span>{v}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="picker j">
          <h3><Icon name="door" size={15} />Jornadas para apresentar <small>{fc.length ? `${fc.length} ${fc.length === 1 ? 'escolhida' : 'escolhidas'}` : 'nenhuma escolhida'}</small></h3>
          <div className="pick-row">
            {CAMINHOS.map((c) => {
              const on = fc.includes(c)
              return (
                <button key={c} className={`pk arch${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle('caminho', c)}>
                  <span className="pk-img"><img src={caminhoImg(c)} alt="" />{on && <i><Icon name="check" size={12} /></i>}</span>
                  <span>{c}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {err && <p className="form-error pb-err">{err}</p>}

      <div className="pb-tabs" role="tablist" aria-label="Livros das escolhas">
        <button role="tab" aria-selected={active === 'tudo'} onClick={() => setTab('tudo')}>{nothing ? 'Sugestões para começar' : 'Tudo'}</button>
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={active === t.id} className={`k-${t.kind}${t.discover ? ' disc' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.discover ? (t.kind === 'valor' ? 'sprout' : 'door') : (t.kind === 'valor' ? 'star' : 'door')} size={13} />{t.label}
          </button>
        ))}
      </div>
      {nothing && <p className="muted sm pb-hint2">Enquanto nada está marcado, mostramos uma história de cada valor e de cada jornada que ainda não apareceu nas leituras.</p>}
      <Rail key={active}>
        {rows.map((r) => (
          <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} onClick={openTitle}
            note={r.note && <span className={r.kind === 'caminho' ? 'door-note' : r.kind === 'valor' ? 'seed-note' : ''}>{r.note}</span>} />
        ))}
      </Rail>
    </section>
  )
}
