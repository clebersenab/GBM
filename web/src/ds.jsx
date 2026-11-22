// Design system GBM: componentes base da plataforma (referência visual em #/design).
import { useEffect, useRef, useState } from 'react'

// Ícones de traço (24×24), um só estilo para toda a plataforma.
const P = {
  home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  sprout: 'M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 7-8 7zM12 14c0-3-2-5-7-5 0 4 2 5 7 5z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  swap: 'M7 7h13l-4-4M17 17H4l4 4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  check: 'M5 12l5 5 9-10',
  book: 'M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14',
  play: 'M8 5l11 7-11 7z',
  up: 'M7 11v9H4v-9zM7 11l4-7c2 0 3 1 3 3v3h5c1 0 2 1 2 2l-2 6c0 1-1 2-2 2H7',
  down: 'M7 13V4H4v9zM7 13l4 7c2 0 3-1 3-3v-3h5c1 0 2-1 2-2l-2-6c0-1-1-2-2-2H7',
  chev: 'M9 6l6 6-6 6',
  pin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  x: 'M6 6l12 12M18 6L6 18',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  door: 'M6 21V8a6 6 0 0 1 12 0v13M4 21h16M14 14h.01',
  palette: 'M12 3a9 9 0 1 0 0 18c1 0 2-1 1-2s0-3 2-3h2a4 4 0 0 0 4-4c0-5-4-9-9-9zM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01M17 11h.01',
}
export function Icon({ name, size = 20, className = '' }) {
  return (
    <svg className={`ico ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  )
}

export function Card({ title, sub, action, className = '', children, pad = true }) {
  return (
    <section className={`card ${pad ? '' : 'flush'} ${className}`}>
      {(title || action) && (
        <header className="card-h">
          <div>{title && <h3>{title}</h3>}{sub && <p className="muted sm">{sub}</p>}</div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

// Número grande com ícone em círculo (tom: orange | blue | green | purple).
export function Stat({ icon, tone = 'orange', value, label, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`stat t-${tone}`} onClick={onClick}>
      <span className="stat-i"><Icon name={icon} /></span>
      <span><b>{value}</b><small>{label}</small></span>
    </Tag>
  )
}

export const STATUS = {
  quero_ler: { label: 'Quero ler', tone: 'blue' },
  lendo: { label: 'Lendo', tone: 'orange' },
  lido: { label: 'Lido', tone: 'green' },
}
export function Tag({ tone = 'mute', children, icon }) {
  return <span className={`tag t-${tone}`}>{icon && <Icon name={icon} size={13} />}{children}</span>
}
export const StatusTag = ({ status }) => (STATUS[status] ? <Tag tone={STATUS[status].tone}>{STATUS[status].label}</Tag> : null)

export function Badge({ children, tone = 'orange' }) {
  return <span className={`badge t-${tone}`}>{children}</span>
}

// Controle segmentado (filtros e abas).
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span className="seg-n">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, max = 100, tone = 'orange', label, right }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="prog">
      {(label || right) && <div className="prog-l"><span>{label}</span><span>{right ?? `${pct}%`}</span></div>}
      <div className={`prog-bar t-${tone}`}><i style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

// Anel de progresso (estilo "support tracker").
export function Ring({ value, max, label, size = 150 }) {
  const r = 52, c = 2 * Math.PI * r, pct = max ? value / max : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} className="ring-bg" />
        <circle cx="60" cy="60" r={r} className="ring-fg" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 60 60)" />
      </svg>
      <div><b>{Math.round(pct * 100)}%</b><small>{label}</small></div>
    </div>
  )
}

export function Empty({ icon = 'book', title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-i"><Icon name={icon} size={28} /></span>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-h">
      <div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {children && <div className="page-h-r">{children}</div>}
    </div>
  )
}

// Capa clicável com etiqueta de status e linha de apoio (motivo da recomendação, box…).
export function Cover({ t, status, note, onClick, size }) {
  return (
    <button className={`cv${size ? ' cv-' + size : ''}`} onClick={() => onClick(t)}>
      <span className="cv-img">
        <img loading="lazy" src={`/${t.capa}`} alt="" />
        {status && <span className="cv-tag"><StatusTag status={status} /></span>}
        <b>{t.titulo}</b>
      </span>
      {note && <small className="cv-note">{note}</small>}
    </button>
  )
}

// Fecha ao clicar fora ou com Esc.
export function useDismiss(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const click = (e) => ref.current && !ref.current.contains(e.target) && onClose()
    const key = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key) }
  }, [open, onClose])
  return ref
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const key = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [onClose])
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-card${wide ? ' wide' : ''}`}>
        <button className="x" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, children }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i />
      <span>{children}</span>
    </label>
  )
}

export function useLocalState(key, initial) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s == null ? initial : JSON.parse(s) } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* sem storage */ } }, [key, v])
  return [v, setV]
}
