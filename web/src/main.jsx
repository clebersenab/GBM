import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { SessionProvider, useSession } from './session'
import Entrar from './pages/Entrar'
import Cadastro from './pages/Cadastro'
import Esqueci from './pages/Esqueci'
import CriarPin from './pages/CriarPin'
import Perfis from './pages/Perfis'
import Estante from './pages/Estante'

// Só entra quem está logado; sem PIN vai criar o PIN; sem perfil escolhido vai para perfis.
function Private({ children, needProfile }) {
  const { me, loading, profile } = useSession()
  if (loading) return <div className="loading">Carregando…</div>
  if (!me) return <Navigate to="/entrar" replace />
  if (!me.pin_set) return <Navigate to="/pin" replace />
  if (needProfile && !profile) return <Navigate to="/perfis" replace />
  return children
}

function PublicOnly({ children }) {
  const { me, loading } = useSession()
  if (loading) return <div className="loading">Carregando…</div>
  return me ? <Navigate to="/perfis" replace /> : children
}

function PinRoute() {
  const { me, loading } = useSession()
  if (loading) return <div className="loading">Carregando…</div>
  if (!me) return <Navigate to="/entrar" replace />
  return me.pin_set ? <Navigate to="/perfis" replace /> : <CriarPin />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route path="/entrar" element={<PublicOnly><Entrar /></PublicOnly>} />
          <Route path="/cadastro" element={<PublicOnly><Cadastro /></PublicOnly>} />
          <Route path="/esqueci" element={<PublicOnly><Esqueci /></PublicOnly>} />
          <Route path="/pin" element={<PinRoute />} />
          <Route path="/perfis" element={<Private><Perfis /></Private>} />
          <Route path="/estante" element={<Private needProfile><Estante /></Private>} />
          <Route path="*" element={<Navigate to="/perfis" replace />} />
        </Routes>
      </HashRouter>
    </SessionProvider>
  </StrictMode>,
)
