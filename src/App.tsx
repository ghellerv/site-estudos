import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './lib/auth'
import { PlanProvider } from './lib/plan'
import Aprofundamentos from './pages/Aprofundamentos'
import Arquivo from './pages/Arquivo'
import Desempenho from './pages/Desempenho'
import DisciplinaEditor from './pages/DisciplinaEditor'
import Jornada from './pages/Jornada'
import Login from './pages/Login'
import MetaPage from './pages/Meta'
import PlanoEditor from './pages/PlanoEditor'
import Planos from './pages/Planos'

export default function App() {
  const { user, carregando } = useAuth()
  if (carregando) return <main className="login"><p className="muted">Carregando…</p></main>
  if (!user) return <Login />
  return (
    <HashRouter>
      <PlanProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<MetaPage />} />
            <Route path="/meta/:n" element={<MetaPage />} />
            <Route path="/arquivo" element={<Arquivo />} />
            <Route path="/desempenho" element={<Desempenho />} />
            <Route path="/jornada" element={<Jornada />} />
            <Route path="/aprofundamentos" element={<Aprofundamentos />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/planos/:id" element={<PlanoEditor />} />
            <Route path="/planos/:id/d/:discId" element={<DisciplinaEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </PlanProvider>
    </HashRouter>
  )
}
