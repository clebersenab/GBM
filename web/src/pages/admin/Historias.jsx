// Lista de histórias por etapa do fluxo. O editor vê só as que estão com ele.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useSession } from '../../session'
import { Icon } from '../../ds'
import { norm } from '../../catalog'
import { STATUS, StatusChip } from './comum'

const ABAS = [['', 'Todas'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])]

export default function Historias() {
  const { me } = useSession()
  const nav = useNavigate()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [aba, setAba] = useState(me.admin ? '' : 'em_edicao')
  const [q, setQ] = useState('')

  useEffect(() => { api('/admin/titles').then(setDados).catch((e) => setErro(e.message)) }, [])

  const itens = useMemo(() => (dados?.items || [])
    .filter((t) => !aba || t.status === aba)
    .filter((t) => !q || norm(t.titulo).includes(norm(q)) || t.slug.includes(norm(q))), [dados, aba, q])

  const total = Object.values(dados?.counts || {}).reduce((a, b) => a + b, 0)
  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Histórias</h1>
          <p className="muted">{me.admin
            ? 'Fluxo: você cria o rascunho, envia para um editor completar páginas e quiz, revisa e publica.'
            : 'Histórias que o administrador enviou para você completar. Quando terminar, envie para revisão.'}</p>
        </div>
        {me.admin && <Link className="btn btn-main" to="/admin/historia/nova"><Icon name="sparkle" size={18} />Nova história</Link>}
      </div>

      <div className="ad-bar">
        <div className="ad-abas" role="group" aria-label="Filtrar por etapa">
          {ABAS.map(([k, label]) => (
            <button key={k} aria-pressed={aba === k} onClick={() => setAba(k)}>
              {label}<b>{k ? dados?.counts?.[k] || 0 : total}</b>
            </button>
          ))}
        </div>
        <label className="ad-busca"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título" /></label>
      </div>

      {erro && <p className="form-error">{erro}</p>}
      {!dados && !erro && <p className="muted">Carregando…</p>}
      {dados && itens.length === 0 && <p className="muted ad-vazio">Nenhuma história {aba ? `em “${STATUS[aba].label.toLowerCase()}”` : 'ainda'}.</p>}

      <ul className="ad-lista">
        {itens.map((t) => (
          <li key={t.db_id}>
            <button onClick={() => nav(`/admin/historia/${t.db_id}`)}>
              {t.capa ? <img src={/^https?:/.test(t.capa) ? t.capa : '/' + t.capa} alt="" loading="lazy" /> : <span className="ad-semcapa"><Icon name="book" /></span>}
              <span className="ad-li-main">
                <b>{t.titulo}</b>
                <small>{t.em_breve && t.status !== 'publicado' ? 'Em breve no catálogo · ' : ''}{t.pages} {t.pages === 1 ? 'página' : 'páginas'}{t.editor && ` · ${t.editor}`}{t.review_note && t.status === 'em_edicao' && ' · devolvida com observação'}</small>
              </span>
              <StatusChip s={t.status} />
              <small className="ad-li-data">{new Date(t.updated_at).toLocaleDateString('pt-BR')}</small>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
