// Peças compartilhadas da administração de histórias.
import { useRef, useState } from 'react'
import { NavLink, Outlet, Link, Navigate } from 'react-router-dom'
import { upload } from '../../api'
import { useSession } from '../../session'
import { Icon } from '../../ds'
import { Logo, ThemeToggle } from '../../theme'
import { prepararImagem } from './imagem'
import './admin.css'

export const STATUS = {
  rascunho: { label: 'Rascunho', tone: 'mute' },
  em_edicao: { label: 'Em edição', tone: 'blue' },
  em_revisao: { label: 'Em revisão', tone: 'purple' },
  publicado: { label: 'Publicada', tone: 'green' },
}
export const StatusChip = ({ s }) => <span className={`ad-status t-${STATUS[s]?.tone}`}>{STATUS[s]?.label || s}</span>

export function AdminLayout() {
  const { me } = useSession()
  if (!me.admin && !me.editor) return <Navigate to="/inicio" replace />
  return (
    <div className="ad">
      <header className="ad-top">
        <Link to="/admin" className="ad-logo" aria-label="Administração"><Logo /><span>{me.admin ? 'Administração' : 'Edição'}</span></Link>
        <nav>
          <NavLink to="/admin" end>Histórias</NavLink>
          {me.admin && <NavLink to="/admin/editores">Editores</NavLink>}
        </nav>
        <span className="ad-sp" />
        <ThemeToggle />
        <Link to="/perfis" className="btn btn-ghost btn-sm">Ir para a plataforma</Link>
      </header>
      <main className="ad-main"><Outlet /></main>
    </div>
  )
}

// Escolher uma imagem, preparar e enviar. Devolve { id, url }.
export function ImagemUpload({ url, onChange, disabled, label = 'Escolher imagem', className = '', max }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState(null)
  async function escolher(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true); setErro(null)
    try { onChange(await enviarImagem(f, max)) } catch (err) { setErro(err.message) } finally { setBusy(false) }
  }
  return (
    <div className={`ad-img ${className}`}>
      <button type="button" className="ad-img-box" onClick={() => input.current.click()} disabled={disabled || busy}>
        {url ? <img src={url} alt="" /> : <span><Icon name="download" />{busy ? 'Enviando…' : label}</span>}
        {url && !disabled && <i>{busy ? 'Enviando…' : 'Trocar'}</i>}
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={escolher} />
      {erro && <small className="form-error">{erro}</small>}
    </div>
  )
}

export async function enviarImagem(file, max) {
  const blob = await prepararImagem(file, max)
  return upload('/admin/images', blob, blob.type === 'image/webp' ? 'imagem.webp' : 'imagem.jpg')
}

export function Escolha({ opcoes, valor, onChange, disabled, cor = '' }) {
  const set = new Set(valor)
  return (
    <div className="ad-escolha">
      {opcoes.map((o) => {
        const id = o.id ?? o, nome = o.nome ?? o
        return (
          <button type="button" key={id} className={cor} aria-pressed={set.has(id)} disabled={disabled}
            onClick={() => onChange(set.has(id) ? valor.filter((x) => x !== id) : [...valor, id])}>
            {set.has(id) && <Icon name="check" size={14} />}{nome}
          </button>
        )
      })}
    </div>
  )
}
