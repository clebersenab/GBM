// Estrutura da área logada: menu lateral retrátil + barra superior (busca e menu do usuário).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from './session'
import { useLibrary } from './library'
import { Logo, ThemeToggle } from './theme'
import { Icon, Badge, useDismiss } from './ds'
import { thumb, avatarImg } from './catalog'
import { search } from './search'
import TitleModal from './TitleModal'
import GroupModal from './GroupModal'

const ShellCtx = createContext(null)
export const useShell = () => useContext(ShellCtx)

// Menu superior (como a Netflix): só 4 destinos de leitura. Conta e assinatura ficam no menu da foto.
const NAV = [
  { to: '/inicio', icon: 'home', label: 'Início' },
  { to: '/explorar', icon: 'compass', label: 'Explorar' },
  { to: '/lista', icon: 'bookmark', label: 'Minha lista', badge: true },
]

export default function Shell() {
  const [title, setTitle] = useState(null)
  const [group, setGroup] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const ctx = useMemo(() => ({ openTitle: setTitle, openGroup: setGroup }), [])
  return (
    <ShellCtx.Provider value={ctx}>
      <div className="shell">
        <header className={`hdr${scrolled ? ' is-scrolled' : ''}`}>
          <div className="hdr-in">
            <NavLink to="/inicio" className="hdr-logo" aria-label="Início"><Logo /></NavLink>
            <Nav className="hdr-nav" />
            <div className="hdr-r">
              <SearchBox />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="content"><Outlet /></main>
        <Nav className="tabbar" mobile />
      </div>
      {group && <GroupModal g={group} onClose={() => setGroup(null)} />}
      {title && <TitleModal key={title.id} t={title} onClose={() => setTitle(null)} />}
    </ShellCtx.Provider>
  )
}

function Nav({ className, mobile }) {
  const { entries } = useLibrary()
  const lista = entries.filter((e) => e.status !== 'lido').length
  return (
    <nav className={className} aria-label="Navegação principal">
      {NAV.map((it) => (
        <NavLink key={it.to} to={it.to} className="nav-a">
          {mobile && <Icon name={it.icon} size={22} />}
          <span>{mobile ? it.short || it.label : it.label}</span>
          {it.badge && lista > 0 && <Badge>{lista}</Badge>}
        </NavLink>
      ))}
    </nav>
  )
}

function SearchBox() {
  const [q, setQ] = useState('')
  const [deb, setDeb] = useState('')
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const { openTitle } = useShell()
  const { bySlug } = useLibrary()
  const nav = useNavigate()
  const input = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss(open, close)

  // Espera uma pausa curta na digitação antes de buscar.
  useEffect(() => { const id = setTimeout(() => setDeb(q), 110); return () => clearTimeout(id) }, [q])
  const results = useMemo(() => search(deb, 7), [deb])
  useEffect(() => setI(0), [deb])

  // Atalho: "/" ou Ctrl/⌘+K foca a busca.
  useEffect(() => {
    const key = (e) => {
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName)
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); input.current?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [])

  const pick = (t) => { openTitle(t); setOpen(false); setQ(''); input.current?.blur() }
  const all = () => { nav(`/explorar?q=${encodeURIComponent(q)}`); setOpen(false) }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(x + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(x - 1, 0)) }
    else if (e.key === 'Enter') { if (results[i]) pick(results[i].t); else if (q.trim()) all() }
  }
  const show = open && deb.trim().length >= 2

  return (
    <div className={`search${open ? ' is-open' : ''}`} ref={ref}>
      <button className="search-btn" aria-label="Buscar" onClick={() => { setOpen(true); setTimeout(() => input.current?.focus(), 0) }}><Icon name="search" /></button>
      <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={onKey}
        placeholder="Título, obra semente, valor ou trecho" aria-label="Buscar livros" role="combobox" aria-expanded={show} />
      {q ? <button className="search-clear" aria-label="Limpar busca" onClick={() => { setQ(''); input.current?.focus() }}><Icon name="x" size={16} /></button> : <kbd>/</kbd>}
      {show && (
        <div className="search-pop" role="listbox">
          {results.length === 0 && <p className="search-none">Nada encontrado para “{deb}”. Tente o nome da obra original ou uma palavra da história.</p>}
          {results.map((r, k) => (
            <button key={r.t.id} role="option" aria-selected={k === i} className="sr" onMouseEnter={() => setI(k)} onClick={() => pick(r.t)}>
              <img src={thumb(r.t.capa)} alt="" className={r.t.em_breve ? 'eb-img' : ''} />
              <span className="sr-t">
                <b>{r.t.titulo}{r.t.em_breve && <em className="eb-txt"> · Em breve</em>}</b>
                <small>{r.field === 'sinopse' ? r.t.sinopse : r.t.obra_mae ? `Semente: ${r.t.obra_mae.titulo}` : r.t.sinopse}</small>
              </span>
              <span className="sr-r">
                {bySlug[r.t.id] && <span className={`dot s-${bySlug[r.t.id].status}`} />}
                <em>{r.why}</em>
              </span>
            </button>
          ))}
          {results.length > 0 && <button className="search-all" onClick={all}>Ver todos os resultados <Icon name="chev" size={16} /></button>}
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const { me, profile, setProfileId, signOut } = useSession()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss(open, close)
  const go = (to) => { setOpen(false); nav(to) }
  return (
    <div className="um" ref={ref}>
      <button className="um-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="um-name"><b>{profile.name}</b><small>{me.name || me.email}</small></span>
        <img src={avatarImg(profile.avatar)} alt="" />
        <Icon name="chev" size={14} className="um-caret" />
      </button>
      {open && (
        <div className="um-pop" role="menu">
          <div className="um-head">
            <img src={avatarImg(profile.avatar)} alt="" />
            <span><b>{profile.name}</b><small>{me.email}</small></span>
          </div>
          <button role="menuitem" onClick={() => { setProfileId(null); go('/perfis') }}><Icon name="swap" />Trocar perfil</button>
          <button role="menuitem" onClick={() => go('/conta')}><Icon name="edit" />Editar perfil</button>
          <button role="menuitem" onClick={() => go('/assinatura')}><Icon name="card" />Gerenciar assinatura</button>
          {(me.admin || me.editor) && <button role="menuitem" onClick={() => go('/admin')}><Icon name="edit" />{me.admin ? 'Administração' : 'Edição de histórias'}</button>}
          {me.admin && <button role="menuitem" onClick={() => go('/design')}><Icon name="palette" />Design system</button>}
          <hr />
          <button role="menuitem" className="um-out" onClick={async () => { setOpen(false); await signOut(); nav('/entrar') }}><Icon name="logout" />Sair da conta</button>
        </div>
      )}
    </div>
  )
}
