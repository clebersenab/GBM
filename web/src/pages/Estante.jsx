import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import catalogo from '../../../data/catalogo.json'
import { api } from '../api'
import { useSession } from '../session'
import { IMG } from '../ui'
import { Modal } from './Perfis'
import Rail from '../Rail'
import { Logo, ThemeToggle } from '../theme'

const byId = Object.fromEntries(catalogo.titulos.map((t) => [t.id, t]))
const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ /g, '-')
const ROW_COLOR = { 'Clássicos da literatura': 'var(--blue)', 'Do cinema e das séries': 'var(--purple)', 'Histórias reais e de fé': 'var(--orange)' }

export default function Estante() {
  const { me, profile, setProfileId } = useSession()
  const nav = useNavigate()
  const [open, setOpen] = useState(null)
  const access = me.access

  const rows = useMemo(() => {
    const lanc = catalogo.lancamentos_ordem.map((id) => byId[id]).filter(Boolean)
    const fileiras = catalogo.fileiras_landing.map((nome) => ({
      nome, cor: ROW_COLOR[nome], itens: catalogo.titulos.filter((t) => t.fileiras?.includes(nome)),
    }))
    return [{ nome: 'Lançamentos', cor: 'var(--orange)', itens: lanc }, ...fileiras]
  }, [])

  return (
    <div className="estante">
      <header className="top">
        <Logo className="logo" />
        <div className="top-r">
        <ThemeToggle />
        <button className="me" onClick={() => { setProfileId(null); nav('/perfis') }} title="Trocar de perfil">
          <img src={`${IMG}/avatares/avatar-${profile.avatar}.webp`} alt="" />
          <span>{profile.name}</span>
        </button>
        </div>
      </header>
      <main className="wrap">
        <h1 className="hello">Oi, {profile.name}!</h1>
        {!access.full_access && (
          <div className="aviso">
            <b>Seu cadastro está pronto.</b> As assinaturas abrem em breve, e avisaremos você.
            Enquanto isso, explore a estante.
          </div>
        )}
        {access.reason === 'liberado' && (
          <div className="aviso ok">Acesso liberado até {new Date(access.access_until).toLocaleDateString('pt-BR')}.</div>
        )}
        {rows.map((r) => (
          <section className="row" key={r.nome}>
            <h2><i style={{ background: r.cor }} />{r.nome}</h2>
            <Rail>
              {r.itens.map((t) => (
                <button className="cv" key={t.id} onClick={() => setOpen(t)}>
                  <img loading="lazy" src={`/${t.capa}`} alt="" />
                  <b>{t.titulo}</b>
                </button>
              ))}
            </Rail>
          </section>
        ))}
      </main>
      {open && <Titulo t={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Titulo({ t, onClose }) {
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(null)
  const o = t.obra_mae

  async function run(kind) {
    setBusy(kind); setMsg(null)
    try {
      if (kind === 'ler') {
        await api(`/titles/${t.id}/read`)
        setMsg({ ok: true, text: 'O leitor chega na próxima etapa. Seu acesso a este livro está confirmado.' })
      } else {
        const { url } = await api(`/titles/${t.id}/download`, { method: 'POST' })
        window.open(url, '_blank', 'noopener')
      }
    } catch (err) {
      setMsg({ ok: false, text: err.code === 'sem_acesso' ? 'As assinaturas abrem em breve. Avisaremos você.' : err.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal title={t.titulo} onClose={onClose}>
      <div className="titulo">
        <img src={`/${t.capa}`} alt="" />
        <div className="stack">
          <p>{t.sinopse}</p>
          {(t.valores?.length > 0 || t.caminhos?.length > 0) && (
            <div className="plantou">
              {t.valores?.length > 0 && (
                <div><small>Valores</small><div className="chips">
                  {t.valores.map((v) => <span className="chip v" key={v}><img src={`${IMG}/cards/valor-${slug(v)}.webp`} alt="" />{v}</span>)}
                </div></div>
              )}
              {t.caminhos?.length > 0 && (
                <div><small>Jornadas</small><div className="chips">
                  {t.caminhos.map((c) => <span className="chip j" key={c}><img src={`${IMG}/cards/caminho-${slug(c)}.webp`} alt="" />{c}</span>)}
                </div></div>
              )}
            </div>
          )}
          {o && <p className="later"><small>Quando crescer, {o.tipo === 'livro' ? 'leia' : 'assista'}</small><b>{o.titulo}</b></p>}
          <div className="acts">
            <button className="btn btn-main" onClick={() => run('ler')} disabled={!!busy}>{busy === 'ler' ? 'Abrindo…' : 'Ler agora'}</button>
            <button className="btn btn-ghost" onClick={() => run('baixar')} disabled={!!busy}>{busy === 'baixar' ? 'Gerando…' : 'Baixar PDF'}</button>
          </div>
          {msg && <p className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</p>}
        </div>
      </div>
    </Modal>
  )
}
