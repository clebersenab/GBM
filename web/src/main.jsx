import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { SessionProvider, useSession } from './session'
import { ThemeProvider } from './theme'
import { LibraryProvider } from './library'
import { atualizarCatalogo } from './catalog'
import Shell from './Shell'
import Entrar from './pages/Entrar'
import Cadastro from './pages/Cadastro'
import Esqueci from './pages/Esqueci'
import Perfis from './pages/Perfis'
import Inicio from './pages/Inicio'
import Explorar from './pages/Explorar'
import Lista from './pages/Lista'
import Conta from './pages/Conta'
import Assinatura from './pages/Assinatura'
import DesignSystem from './pages/DesignSystem'

const Leitor = lazy(() => import('./pages/Leitor'))
const AdminLayout = lazy(() => import('./pages/admin/comum').then((m) => ({ default: m.AdminLayout })))
const Historias = lazy(() => import('./pages/admin/Historias'))
const Historia = lazy(() => import('./pages/admin/Historia'))
const Editores = lazy(() => import('./pages/admin/Editores'))
const carregando = <div className="loading">Carregando…</div>

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

// Busca o catálogo atualizado e redesenha as telas se ele mudou. No meio de uma leitura,
// espera a pessoa sair do livro para não perder a página.
function CatalogoAtual({ children }) {
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    let pendente = false
    const lendo = () => location.hash.startsWith('#/ler/')
    const aplicar = () => { if (pendente && !lendo()) { pendente = false; setVersao((v) => v + 1) } }
    atualizarCatalogo().then((mudou) => { pendente = mudou; aplicar() }).catch(() => {})
    window.addEventListener('hashchange', aplicar)
    return () => window.removeEventListener('hashchange', aplicar)
  }, [])
  return <div key={versao} style={{ display: 'contents' }}>{children}</div>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessionProvider>
    <ThemeProvider>
      <HashRouter>
        <CatalogoAtual>
        <Routes>
          <Route path="/entrar" element={<PublicOnly><Entrar /></PublicOnly>} />
          <Route path="/cadastro" element={<PublicOnly><Cadastro /></PublicOnly>} />
          <Route path="/esqueci" element={<PublicOnly><Esqueci /></PublicOnly>} />
          <Route path="/perfis" element={<Private><Perfis /></Private>} />
          <Route element={<Private needProfile><LibraryProvider><Shell /></LibraryProvider></Private>}>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/explorar" element={<Explorar />} />
            <Route path="/lista" element={<Lista />} />
            <Route path="/conta" element={<Conta />} />
            <Route path="/assinatura" element={<Assinatura />} />
            <Route path="/design" element={<DesignSystem />} />
          </Route>
          <Route path="/ler/:slug" element={<Private needProfile><LibraryProvider><Suspense fallback={<div className="loading">Abrindo o livro…</div>}><Leitor /></Suspense></LibraryProvider></Private>} />
          <Route path="/previa/:slug" element={<Private><LibraryProvider><Suspense fallback={carregando}><Leitor /></Suspense></LibraryProvider></Private>} />
          <Route path="/admin" element={<Private><Suspense fallback={carregando}><AdminLayout /></Suspense></Private>}>
            <Route index element={<Suspense fallback={carregando}><Historias /></Suspense>} />
            <Route path="historia/:id" element={<Suspense fallback={carregando}><Historia /></Suspense>} />
            <Route path="editores" element={<Suspense fallback={carregando}><Editores /></Suspense>} />
          </Route>
          <Route path="/estante" element={<Navigate to="/inicio" replace />} />
          <Route path="/cultivar" element={<Navigate to="/inicio" replace />} />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
        </CatalogoAtual>
      </HashRouter>
    </ThemeProvider>
    </SessionProvider>
  </StrictMode>,
)
