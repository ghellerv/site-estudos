import { useAuth } from './lib/auth'
import { firebaseConfigurado } from './lib/firebaseConfig'
import Login from './pages/Login'
import Inicio from './pages/Inicio'

export default function App() {
  const { user, carregando } = useAuth()

  if (!firebaseConfigurado) {
    return (
      <main className="login">
        <div className="login-card">
          <h1>Quase lá</h1>
          <p className="muted">Falta preencher a configuração do Firebase em src/lib/firebaseConfig.ts.</p>
        </div>
      </main>
    )
  }
  if (carregando) return <main className="login"><p className="muted">Carregando…</p></main>
  return user ? <Inicio /> : <Login />
}
