// Estante da criança ativa: status de leitura, gostei/não gostei e sinais de interesse.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useSession } from './session'

const Ctx = createContext(null)

export function LibraryProvider({ children }) {
  const { profile } = useSession()
  const pid = profile?.id
  const [entries, setEntries] = useState([])
  const [signals, setSignals] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!pid) return
    let live = true
    setReady(false)
    Promise.all([api(`/profiles/${pid}/library`), api(`/profiles/${pid}/signals`)])
      .then(([e, s]) => { if (live) { setEntries(e); setSignals(s) } })
      .catch(() => {})
      .finally(() => live && setReady(true))
    return () => { live = false }
  }, [pid])

  const bySlug = useMemo(() => Object.fromEntries(entries.map((e) => [e.slug, e])), [entries])

  // Atualiza na hora e confirma com o servidor (desfaz se falhar).
  const save = useCallback(async (slug, patch) => {
    const before = entries
    const now = new Date().toISOString()
    setEntries((list) => [{ ...(list.find((e) => e.slug === slug) || { slug, status: 'quero_ler' }), ...patch, updated_at: now },
      ...list.filter((e) => e.slug !== slug)])
    try {
      const saved = await api(`/profiles/${pid}/library/${slug}`, { method: 'PUT', body: patch })
      setEntries((list) => list.map((e) => (e.slug === slug ? saved : e)))
    } catch (err) {
      setEntries(before)
      throw err
    }
  }, [entries, pid])

  const remove = useCallback(async (slug) => {
    const before = entries
    setEntries((list) => list.filter((e) => e.slug !== slug))
    try { await api(`/profiles/${pid}/library/${slug}`, { method: 'DELETE' }) } catch (err) { setEntries(before); throw err }
  }, [entries, pid])

  const signal = useCallback((kind, key) => {
    setSignals((list) => {
      const found = list.find((s) => s.kind === kind && s.key === key)
      return found ? list.map((s) => (s === found ? { ...s, count: s.count + 1 } : s)) : [...list, { kind, key, count: 1 }]
    })
    api(`/profiles/${pid}/signals`, { method: 'POST', body: { kind, key } }).catch(() => {})
  }, [pid])

  const value = { entries, bySlug, signals, ready, save, remove, signal, profile }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useLibrary = () => useContext(Ctx)
