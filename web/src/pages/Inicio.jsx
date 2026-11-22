import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../session'
import { useLibrary } from '../library'
import { useShell } from '../Shell'
import Rail from '../Rail'
import { Card, Cover, Empty, Icon, Progress, Ring, Stat, Tag } from '../ds'
import { GRUPOS, LANCAMENTOS, TITULOS, VALORES, byId, valorImg, caminhoImg } from '../catalog'
import { focusThemes, recommend, themeRow } from '../recommend'

const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

export default function Inicio() {
  const { me, profile } = useSession()
  const { entries, bySlug, signals, ready } = useLibrary()
  const { openTitle } = useShell()
  const nav = useNavigate()
  const ctx = { entries, profile, signals }

  const lidos = entries.filter((e) => e.status === 'lido')
  const lendo = entries.filter((e) => e.status === 'lendo')
  const quero = entries.filter((e) => e.status === 'quero_ler')
  const recs = useMemo(() => recommend(ctx, 14), [entries, signals, profile]) // eslint-disable-line react-hooks/exhaustive-deps
  const themes = useMemo(() => focusThemes(ctx, 2), [entries, signals, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Valores que já foram plantados pelas leituras concluídas.
  const jardim = VALORES.map((v) => ({ v, n: lidos.filter((e) => byId[e.slug]?.valores?.includes(v)).length }))
  const cultivados = jardim.filter((x) => x.n > 0).length
  const boxes = GRUPOS.filter((g) => g.tipo === 'box').map((g) => ({ g, lidos: g.titulos.filter((id) => bySlug[id]?.status === 'lido').length,
    started: g.titulos.some((id) => bySlug[id]) })).filter((b) => b.started)
  const next = lendo[0] ? byId[lendo[0].slug] : recs[0]?.t

  return (
    <div className="dash">
      <section className="hero-card">
        <div>
          <p className="eyebrow">{saudacao()}, {profile.name}!</p>
          <h1>{lidos.length ? <>Vocês já leram <em>{lidos.length} {lidos.length === 1 ? 'livro' : 'livros'}</em> juntos.</> : <>Que história vamos plantar hoje?</>}</h1>
          <p className="muted">{next ? <>{lendo[0] ? 'Continue de onde pararam:' : 'Uma boa para começar:'} <b>{next.titulo}</b></> : 'Explore o catálogo e monte a lista de leitura.'}</p>
          <div className="acts">
            {next && <button className="btn btn-main" onClick={() => openTitle(next)}><Icon name="play" size={18} />{lendo[0] ? 'Continuar lendo' : 'Ver o livro'}</button>}
            <Link className="btn btn-ghost" to="/cultivar"><Icon name="sprout" size={18} />Plantar e cultivar</Link>
          </div>
        </div>
        {next && <img className="hero-cover" src={`/${next.capa}`} alt="" />}
      </section>

      {!me.access.full_access && (
        <div className="aviso"><b>Seu cadastro está pronto.</b> As assinaturas abrem em breve, e avisaremos você. Enquanto isso, explore e monte a lista.</div>
      )}

      <div className="stats">
        <Stat icon="check" tone="green" value={lidos.length} label="Lidos" onClick={() => nav('/lista?f=lido')} />
        <Stat icon="book" tone="orange" value={lendo.length} label="Lendo" onClick={() => nav('/lista?f=lendo')} />
        <Stat icon="bookmark" tone="blue" value={quero.length} label="Quero ler" onClick={() => nav('/lista?f=quero_ler')} />
        <Stat icon="sprout" tone="purple" value={`${cultivados}/${VALORES.length}`} label="Valores plantados" onClick={() => nav('/cultivar')} />
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

      {ready && themes.map((th) => {
        const row = themeRow(ctx, th, 14)
        if (!row.length) return null
        return (
          <Card key={th.kind + th.key} pad={false} className="theme-row"
            title={<span className="th-t"><img src={th.kind === 'valor' ? valorImg(th.key) : caminhoImg(th.key)} alt="" />{th.kind === 'valor' ? `Para cultivar ${th.key}` : `Jornada: ${th.key}`}</span>}
            sub={th.explicit ? 'Foco que vocês escolheram para este perfil' : 'Percebemos que vocês têm buscado por isso'}
            action={<Link className="tlink sm" to="/conta?aba=criancas">Ajustar foco</Link>}>
            <Rail>{row.map((r) => <Cover key={r.t.id} t={r.t} status={bySlug[r.t.id]?.status} onClick={openTitle} />)}</Rail>
          </Card>
        )
      })}

      <div className="grid-3">
        <Card title="Jardim de valores" sub="O que as leituras concluídas já plantaram">
          <div className="jardim">
            <Ring value={cultivados} max={VALORES.length} label="plantados" size={132} />
            <div className="jardim-l">
              {jardim.map(({ v, n }) => (
                <div key={v} className={`jv${n ? '' : ' off'}`}><img src={valorImg(v)} alt="" /><span>{v}</span><b>{n}</b></div>
              ))}
            </div>
          </div>
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
