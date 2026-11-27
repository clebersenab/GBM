// Ficha do livro: sinopse, valores e jornadas, box, status de leitura, ler e baixar.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api'
import { useLibrary } from './library'
import { useShell } from './Shell'
import { EmBreve, Icon, Modal, STATUS } from './ds'
import { src, thumb, boxOf, byId, grupoById, valorImg, caminhoImg } from './catalog'

export default function TitleModal({ t, onClose }) {
  const { bySlug, save, remove } = useLibrary()
  const { openTitle, openGroup } = useShell()
  const entry = bySlug[t.id]
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(null)
  const nav = useNavigate()
  const o = t.obra_mae
  const box = boxOf(t)
  const colecoes = (t.colecoes || []).map((id) => grupoById[id]).filter(Boolean)

  async function setStatus(status) {
    setMsg(null)
    try {
      if (entry?.status === status) await remove(t.id)
      else await save(t.id, { status })
    } catch (err) { setMsg({ ok: false, text: err.message }) }
  }
  async function like(v) {
    try { await save(t.id, { status: 'lido', liked: entry?.liked === v ? null : v }) } catch (err) { setMsg({ ok: false, text: err.message }) }
  }

  async function run(kind) {
    setBusy(kind); setMsg(null)
    try {
      if (kind === 'ler') {
        const book = await api(`/titles/${t.id}/read`)
        if (!book.paginas) {
          if (entry?.status !== 'lido') await save(t.id, { status: 'lendo' })
          setMsg({ ok: true, text: 'Este livro ainda está sendo preparado. Ele ficou marcado como “lendo” e avisaremos quando estiver pronto.' })
          return
        }
        onClose()
        nav(`/ler/${t.id}`, { state: { book } })
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
    <Modal title={t.titulo} onClose={onClose} wide>
      <div className="titulo">
        <div className="tm-lado">
          <span className={`tm-capa${t.em_breve ? ' eb' : ''}`}>
            <img src={src(t.capa)} alt="" />
            {t.em_breve ? <EmBreve /> : <button className="tm-ler" onClick={() => run('ler')} disabled={!!busy} aria-label="Ler agora"><Icon name="play" size={30} /></button>}
          </span>
          {entry?.status === 'lido' && (
            <div className="tm-like">
              <span>Gostou?</span>
              <button aria-pressed={entry.liked === true} onClick={() => like(true)} aria-label="Gostei" title="Gostei"><Icon name="up" size={18} /></button>
              <button aria-pressed={entry.liked === false} onClick={() => like(false)} aria-label="Não gostei" title="Não gostei"><Icon name="down" size={18} /></button>
            </div>
          )}
        </div>
        <div className="stack tm-info">
          <p className="tm-sinopse">{t.sinopse}</p>

          {box && (
            <div className="tm-box">
              <small>Volume {box.index + 1} de {box.total} do box <b>{box.grupo.titulo}</b></small>
              <div className="tm-vols">
                {box.grupo.titulos.map((id, k) => byId[id] && (
                  <button key={id} className={id === t.id ? 'now' : ''} onClick={() => id !== t.id && openTitle(byId[id])} title={byId[id].titulo}>
                    <img src={thumb(byId[id].capa)} alt="" className={byId[id].em_breve ? 'eb-img' : ''} />
                    <span>{k + 1}</span>
                    {bySlug[id]?.status === 'lido' && <i><Icon name="check" size={12} /></i>}
                  </button>
                ))}
              </div>
              {box.index > 0 && bySlug[box.grupo.titulos[box.index - 1]]?.status !== 'lido' && (
                <p className="muted sm">Para uma experiência melhor, leia antes <b>{byId[box.grupo.titulos[box.index - 1]]?.titulo}</b>.</p>
              )}
              <button className="tlink sm" onClick={() => { onClose(); openGroup(box.grupo) }}>Ver o roteiro do box</button>
            </div>
          )}
          {colecoes.map((g) => (
            <p key={g.id} className="tm-col">
              Coleção <b>{g.titulo}</b> · {g.titulos.length} {g.titulos.length === 1 ? 'livro' : 'livros'} para ler em qualquer ordem.{' '}
              <button className="tlink" onClick={() => { onClose(); openGroup(g) }}>Ver a coleção</button>
            </p>
          ))}

          {(t.valores?.length > 0 || t.caminhos?.length > 0 || o) && (
            <dl className="tm-meta">
              {t.valores?.length > 0 && (
                <div><dt>{t.valores.length === 1 ? 'Valor' : 'Valores'}</dt><dd>
                  {t.valores.map((v) => <span className="tm-tag v" key={v}><img src={valorImg(v)} alt="" />{v}</span>)}
                </dd></div>
              )}
              {t.caminhos?.length > 0 && (
                <div><dt>{t.caminhos.length === 1 ? 'Jornada' : 'Jornadas'}</dt><dd>
                  {t.caminhos.map((c) => <span className="tm-tag j" key={c}><img src={caminhoImg(c)} alt="" />{c}</span>)}
                </dd></div>
              )}
              {o && <div className="tm-later"><dt>Quando crescer, {o.tipo === 'livro' ? 'leia' : 'assista'}</dt><dd><b>{o.titulo}</b></dd></div>}
            </dl>
          )}

          <div className="tm-status">
            <small>Na estante</small>
            <div className="seg" role="group" aria-label="Status de leitura">
              {Object.entries(STATUS).filter(([k]) => !t.em_breve || k === 'quero_ler').map(([k, s]) => (
                <button key={k} aria-pressed={entry?.status === k} className={`s-${k}`} onClick={() => setStatus(k)}>
                  {entry?.status === k && <Icon name="check" size={14} />}{s.label}
                </button>
              ))}
            </div>
          </div>

          {t.em_breve ? (
          <div className="acts">
            <button className="btn btn-main" disabled><Icon name="clock" size={18} />Em breve</button>
            <p className="muted sm">Esta história ainda está sendo ilustrada. Marque como “Quero ler” para ela aparecer na sua lista quando abrir.</p>
          </div>
          ) : (
          <div className="acts">
            <button className="btn btn-main" onClick={() => run('ler')} disabled={!!busy}><Icon name="play" size={18} />{busy === 'ler' ? 'Abrindo…' : entry?.status === 'lendo' && entry.page > 0 ? 'Continuar lendo' : 'Ler agora'}</button>
            <button className="btn btn-ghost" onClick={() => run('baixar')} disabled={!!busy}><Icon name="download" size={18} />{busy === 'baixar' ? 'Gerando…' : 'Baixar PDF'}</button>
          </div>
          )}
          {msg && <p className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</p>}
        </div>
      </div>
    </Modal>
  )
}
