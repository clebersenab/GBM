import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../session'
import { useLibrary } from '../library'
import { useShell } from '../Shell'
import Rail from '../Rail'
import BookAnim from '../BookAnim'
import { Card, Cover, Empty, Icon, Progress, Stat, Tag } from '../ds'
import { CAMINHOS, DESTAQUE_IMG, GRUPOS, LANCAMENTOS, TITULOS, VALORES, byId, valorImg, caminhoImg } from '../catalog'
import { emphasis, journeyThemes, newDoors, recommend, themeBooks, valueThemes } from '../recommend'

const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

export default function Inicio() {
  const { me, profile } = useSession()
  const { entries, bySlug, signals, ready, save, remove } = useLibrary()
  const { openTitle } = useShell()
  const nav = useNavigate()
  const ctx = { entries, profile, signals }

  const lidos = entries.filter((e) => e.status === 'lido')
  const lendo = entries.filter((e) => e.status === 'lendo')
  const quero = entries.filter((e) => e.status === 'quero_ler')
  const recs = useMemo(() => recommend(ctx, 14), [entries, signals, profile]) // eslint-disable-line react-hooks/exhaustive-deps
  const themes = useMemo(() => valueThemes(ctx, 3), [entries, signals, profile]) // eslint-disable-line react-hooks/exhaustive-deps
  const journeys = useMemo(() => journeyThemes(ctx), [profile]) // eslint-disable-line react-hooks/exhaustive-deps
  const enf = useMemo(() => emphasis(entries), [entries])
  const nextDoors = useMemo(() => newDoors(ctx, 6), [entries, signals, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const boxes = GRUPOS.filter((g) => g.tipo === 'box').map((g) => ({ g, lidos: g.titulos.filter((id) => bySlug[id]?.status === 'lido').length,
    started: g.titulos.some((id) => bySlug[id]) })).filter((b) => b.started)
  // Banner: um lançamento em destaque (o primeiro da ordem de lançamentos).
  const destaque = byId[LANCAMENTOS[0]]

  return (
    <div className="dash">
      <p className="greet">{saudacao()}, {profile.name}! {lidos.length ? <>Vocês já leram <b>{lidos.length} {lidos.length === 1 ? 'livro' : 'livros'}</b> juntos.</> : 'Que história vamos ler hoje?'}</p>

      {destaque && (
        <section className="hero-card">
          <div className="hero-txt">
            <p className="eyebrow">Lançamento</p>
            <h1>{destaque.titulo}</h1>
            <p className="hero-sin">{destaque.sinopse}</p>
            <div className="hero-tags">
              {destaque.valores?.map((v) => <Tag key={v} tone="orange" icon="sprout">{v}</Tag>)}
              {destaque.caminhos?.map((c) => <Tag key={c} tone="blue" icon="door">{c}</Tag>)}
            </div>
            {destaque.obra_mae && <p className="hero-seed">Semente: <b>{destaque.obra_mae.titulo}</b>{destaque.obra_mae.autor && `, ${destaque.obra_mae.autor}`}</p>}
            <div className="acts">
              <button className="btn btn-main" onClick={() => openTitle(destaque)}><Icon name="play" size={18} />{bySlug[destaque.id]?.status === 'lendo' ? 'Continuar lendo' : 'Ler agora'}</button>
              {(!bySlug[destaque.id] || bySlug[destaque.id].status === 'quero_ler') && (
                <button className="btn btn-ghost" aria-pressed={!!bySlug[destaque.id]}
                  onClick={() => (bySlug[destaque.id] ? remove(destaque.id) : save(destaque.id, { status: 'quero_ler' })).catch(() => {})}>
                  <Icon name={bySlug[destaque.id] ? 'check' : 'bookmark'} size={18} />{bySlug[destaque.id] ? 'Na sua lista' : 'Ler depois'}
                </button>
              )}
            </div>
          </div>
          <BookAnim img={`/${DESTAQUE_IMG.has(destaque.id) ? `images/destaques/${destaque.id}.webp` : destaque.capa}`} />
        </section>
      )}

      {!me.access.full_access && (
        <div className="aviso"><b>Seu cadastro está pronto.</b> As assinaturas abrem em breve, e avisaremos você. Enquanto isso, explore e monte a lista.</div>
      )}

      <div className="stats stats-3">
        <Stat icon="check" tone="green" value={lidos.length} label="Lidos" onClick={() => nav('/lista?f=lido')} />
        <Stat icon="book" tone="purple" value={lendo.length} label="Lendo" onClick={() => nav('/lista?f=lendo')} />
        <Stat icon="bookmark" tone="blue" value={quero.length} label="Quero ler" onClick={() => nav('/lista?f=quero_ler')} />
      </div>

      {lendo.length > 0 && (
        <Card title="Continue lendo" pad={false}>
          <Rail>{lendo.map((e) => byId[e.slug] && <Cover key={e.slug} t={byId[e.slug]} status="lendo" onClick={openTitle} />)}</Rail>
        </Card>
      )}

      <Card title={`Recomendados para ${profile.name}`} sub="Com base no que vocês leram, gostaram e querem cultivar" pad={false}
        action={<Tag tone="purple" icon="sparkle">Para você</Tag>}>
        {ready && <Rail>{recs.map((r) => <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} note={r.reason} onClick={openTitle} />)}</Rail>}
      </Card>

      {ready && [...themes, ...journeys].map((th) => {
        const row = themeBooks(ctx, th, 14)
        if (!row.length) return null
        const v = th.kind === 'valor'
        return (
          <Card key={th.kind + th.key} pad={false}
            title={<span className="th-t"><img className={v ? '' : 'door-ic'} src={v ? valorImg(th.key) : caminhoImg(th.key)} alt="" />{v ? `Para cultivar ${th.key}` : `Apresentando ${th.key}`}</span>}
            sub={v ? (th.explicit ? 'Valor em foco: vale ler várias histórias sobre ele' : 'Percebemos que vocês têm buscado este valor. Coloque em foco para fixar.')
              : 'Jornada que vocês escolheram apresentar'}
            action={<Link className="tlink sm" to="/cultivar">{v ? 'Ajustar valores' : 'Ajustar jornadas'}</Link>}>
            <Rail>{row.map((t) => <Cover key={t.id} t={t} status={bySlug[t.id]?.status} onClick={openTitle} />)}</Rail>
          </Card>
        )
      })}

      {ready && nextDoors.length > 0 && (
        <Card pad={false}
          title={<span className="th-t"><img className="door-ic" src={caminhoImg(nextDoors[0].key)} alt="" />Novas portas para {profile.name}</span>}
          sub="Uma história de cada jornada que ainda não apareceu nas leituras"
          action={<Link className="tlink sm" to="/cultivar">Escolher jornadas</Link>}>
          <Rail>{nextDoors.map((d) => <Cover key={d.key} t={d.t} status={bySlug[d.t.id]?.status} onClick={openTitle}
            note={<span className="door-note">{d.chosen && <Icon name="door" size={13} />}Jornada: {d.key}</span>} />)}</Rail>
        </Card>
      )}

      <div className="grid-2">
        <Card title="Jardim de valores" sub="Quanto mais um valor aparece nas leituras, mais ele cresce">
          <Garden rows={enf.valores} name={profile.name} />
        </Card>

        <Card title="Corrida das jornadas" sub="Quem está na frente é a que mais tem a ver: conta o que leu e, principalmente, o que gostou">
          <Race rows={enf.caminhos} />
        </Card>

        <Card title="Boxes em andamento" sub="A ordem certa faz diferença">
          {boxes.length ? (
            <div className="stack">
              {boxes.map(({ g, lidos: n }) => (
                <button key={g.id} className="box-p" onClick={() => openTitle(byId[g.titulos.find((id) => bySlug[id]?.status !== 'lido') || g.titulos[0]])}>
                  <img src={`/${g.arte}`} alt="" />
                  <Progress value={n} max={g.titulos.length} tone="purple" label={g.titulo} right={`${n}/${g.titulos.length}`} />
                </button>
              ))}
            </div>
          ) : <Empty icon="grid" title="Nenhum box começado">Boxes são histórias em volumes, para ler em ordem.</Empty>}
        </Card>

        <Card title="Atividade recente">
          {entries.length ? (
            <ol className="timeline">
              {entries.slice(0, 5).map((e) => byId[e.slug] && (
                <li key={e.slug} className={`s-${e.status}`}>
                  <button className="tlink plain" onClick={() => openTitle(byId[e.slug])}>{byId[e.slug].titulo}</button>
                  <small>{{ quero_ler: 'Entrou na lista', lendo: 'Começou a ler', lido: e.liked ? 'Leu e gostou' : e.liked === false ? 'Leu, mas não gostou' : 'Terminou de ler' }[e.status]} · {quando(e.updated_at)}</small>
                </li>
              ))}
            </ol>
          ) : <Empty icon="clock" title="Nada por aqui ainda">Marque livros como “quero ler”, “lendo” ou “lido”.</Empty>}
        </Card>
      </div>

      <Card title="Lançamentos" pad={false}>
        <Rail>{[...LANCAMENTOS.map((id) => byId[id]), ...TITULOS.filter((t) => t.lancamento && !LANCAMENTOS.includes(t.id))].filter(Boolean)
          .map((t) => <Cover key={t.id} t={t} status={bySlug[t.id]?.status} onClick={openTitle} />)}</Rail>
      </Card>
    </div>
  )
}

export function quando(iso) {
  const d = (Date.now() - new Date(iso)) / 864e5
  if (d < 1 / 24) return 'agora há pouco'
  if (d < 1) return `há ${Math.round(d * 24)} h`
  if (d < 2) return 'ontem'
  if (d < 30) return `há ${Math.round(d)} dias`
  return new Date(iso).toLocaleDateString('pt-BR')
}

// Jardim: todos os valores, ordenados pelo peso; a planta cresce com o peso.
function Garden({ rows, name }) {
  const grown = useGrow()
  const w = Object.fromEntries(rows.map((r) => [r.key, r]))
  const all = VALORES.map((v) => w[v] || { key: v, w: 0, pct: 0, read: 0 }).sort((a, b) => b.w - a.w)
  const max = all[0].w || 1
  const lead = all[0].w > 0 ? all[0] : null
  return (
    <div className="garden">
      <p className="garden-lead">{lead ? <><b>{lead.key}</b> é o que mais tem crescido em {name}.</> : <>Ainda não brotou nada. Cada livro lido rega o jardim.</>}</p>
      <ol className="beds">
        {all.map((r, i) => {
          const size = r.w ? 0.42 + 0.58 * (r.w / max) : 0.26
          return (
            <li key={r.key} className={`bed${r.w ? '' : ' sprout'}${i === 0 && r.w ? ' first' : ''}`} title={r.w ? `${Math.round(r.pct * 100)}% das leituras` : 'Ainda não apareceu'}>
              <span className="plant">{r.w > 0 && i < 3 && <span className={`medal m${i + 1}`}>{i + 1}º</span>}<img src={valorImg(r.key)} alt="" style={{ width: `${(grown ? size : 0.15) * 100}%` }} /></span>
              <b>{r.key}</b>
              <small>{r.read ? `${r.read} ${r.read === 1 ? 'livro' : 'livros'}` : 'broto'}</small>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// Corrida: uma raia por jornada; a porta avança conforme a afinidade.
function Race({ rows }) {
  const go = useGrow()
  const w = Object.fromEntries(rows.map((r) => [r.key, r]))
  const all = CAMINHOS.map((c) => w[c] || { key: c, w: 0, read: 0, liked: 0 }).sort((a, b) => b.w - a.w)
  const max = all[0].w || 1
  const leader = all[0].w > 0 ? all[0].key : null
  return (
    <div className="race">
      <p className="race-lead">{leader ? <><b>{leader}</b> está na frente{w[leader].liked ? `: gostou de ${w[leader].liked} de ${w[leader].read}` : ''}.</> : <>A corrida ainda não começou. Leia uma história de qualquer jornada para dar a largada.</>}</p>
      <ol className="lanes">
        {all.map((r) => {
          const pos = r.w ? 8 + 84 * (r.w / max) : 0
          return (
            <li key={r.key} className={`lane${r.key === leader ? ' lead' : ''}${r.w ? '' : ' idle'}`}>
              <span className="lane-n">{r.key}</span>
              <span className="lane-t">
                <span className="runner" style={{ left: `${go ? pos : 0}%` }}>
                  <img src={caminhoImg(r.key)} alt="" />
                  {r.key === leader && <i className="crown"><Icon name="star" size={12} /></i>}
                </span>
                <span className="finish" aria-hidden="true" />
              </span>
              <small className="lane-s">{r.w ? (r.liked ? `♥ ${r.liked}` : `${r.read} lido${r.read > 1 ? 's' : ''}`) : 'largada'}</small>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// Liga a animação logo depois de montar (as plantas crescem e as portas correm).
function useGrow() {
  const [on, setOn] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setTimeout(() => setOn(true), 120)); return () => cancelAnimationFrame(id) }, [])
  return on
}
