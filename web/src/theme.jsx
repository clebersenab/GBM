import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { api, getToken } from './api'
import { useSession } from './session'

const Ctx = createContext(null)
const KEY = 'gbm-tema-app'

const readLocal = () => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* sem storage */ }
  return 'dark'
}

// Tema da plataforma: escuro por padrão. A escolha fica salva neste aparelho
// e, com a conta logada, nas configurações da conta (vale em outros aparelhos).
export function ThemeProvider({ children }) {
  const { me } = useSession()
  const [theme, setTheme] = useState(readLocal)
  const synced = useRef(null)

  // Ao entrar na conta, a preferência salva nela prevalece.
  useEffect(() => {
    if (me?.theme && synced.current !== me.email) {
      synced.current = me.email
      setTheme(me.theme)
    }
    if (!me) synced.current = null
  }, [me])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(KEY, theme) } catch { /* sem storage */ }
  }, [theme])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    if (getToken()) api('/me/preferences', { method: 'PATCH', body: { theme: next } }).catch(() => { /* fica salvo no aparelho */ })
  }
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const light = theme === 'light'
  return (
    <button className="theme" onClick={toggle} aria-label={light ? 'Usar tema escuro' : 'Usar tema claro'} title={light ? 'Tema escuro' : 'Tema claro'}>
      {light ? (
        <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>
      ) : (
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      )}
    </button>
  )
}

export function Logo({ className }) {
  const { theme } = useTheme()
  return <img className={className} src={`/images/marca/logo-nav${theme === 'light' ? '-claro' : ''}.png`} alt="GBM" />
}
