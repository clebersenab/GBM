import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api'

const Ctx = createContext(null)
const PROFILE_KEY = 'gbm-perfil'

export function SessionProvider({ children }) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(!!getToken())
  const [profileId, setProfileIdState] = useState(() => {
    try { return Number(localStorage.getItem(PROFILE_KEY)) || null } catch { return null }
  })

  const refresh = useCallback(async () => {
    if (!getToken()) { setMe(null); setLoading(false); return null }
    try {
      const data = await api('/me')
      setMe(data)
      return data
    } catch {
      setMe(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const signIn = (token, account) => { setToken(token); setMe(account) }
  const signOut = async () => {
    try { await api('/auth/session', { method: 'DELETE' }) } catch { /* já expirada */ }
    setToken(null); setMe(null); setProfileId(null)
  }
  const setProfileId = (id) => {
    setProfileIdState(id)
    try { id ? localStorage.setItem(PROFILE_KEY, String(id)) : localStorage.removeItem(PROFILE_KEY) } catch { /* sem storage */ }
  }
  const profile = me?.profiles?.find((p) => p.id === profileId) || null

  return (
    <Ctx.Provider value={{ me, loading, refresh, signIn, signOut, profile, setProfileId }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSession = () => useContext(Ctx)
