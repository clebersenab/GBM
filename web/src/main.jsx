import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { SessionProvider, useSession } from './session'
import { ThemeProvider } from './theme'
import { LibraryProvider } from './library'
import Shell from './Shell'
import Entrar from './pages/Entrar'
import Cadastro from './pages/Cadastro'
import Esqueci from './pages/Esqueci'
import Perfis from './pages/Perfis'
import Inicio from './pages/Inicio'
import Explorar from './pages/Explorar'
import Lista from './pages/Lista'
import Cultivar from './pages/Cultivar'
import Conta from './pages/Conta'
import Assinatura from './pages/Assinatura'
import DesignSystem from './pages/DesignSystem'

// Só entra quem está logado; sem perfil escolhido vai para "Quem vai ler hoje?".
function Private({ children, needProfile }) {
  const { me, loading, profile } = useSession()
  if (loading) return <div className="loading">Carregando…</div>
  if (!me) return <Navigate to="/entrar" replace />
  if (needProfile && !profile) return <Navigate to="/perfis" replace />
  return children
}

function PublicOnly({ children }) {
  const { me, loading } = useSession()
  if (loading) return <div className="loading">Carregando…</div>
  return me ? <Navigate to="/perfis" replace /> : children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessionProvider>
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/entrar" element={<PublicOnly><Entrar /></PublicOnly>} />
          <Route path="/cadastro" element={<PublicOnly><Cadastro /></PublicOnly>} />
          <Route path="/esqueci" element={<PublicOnly><Esqueci /></PublicOnly>} />
          <Route path="/perfis" element={<Private><Perfis /></Private>} />
          <Route element={<Private needProfile><LibraryProvider><Shell /></LibraryProvider></Private>}>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/explorar" element={<Explorar />} />
            <Route path="/lista" element={<Lista />} />
            <Route path="/cultivar" element={<Cultivar />} />
            <Route path="/conta" element={<Conta />} />
            <Route path="/assinatura" element={<Assinatura />} />
            <Route path="/design" element={<DesignSystem />} />
          </Route>
          <Route path="/estante" element={<Navigate to="/inicio" replace />} />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
    </SessionProvider>
  </StrictMode>,
)
