import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePlano } from '../lib/plan'
import { MODO_DEMO } from '../lib/store'
import { NomeMarca, Simbolo } from './Logo'

const I = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)
const NAV: { to: string; rotulo: string; curto?: string; d: string }[] = [
  { to: '/', rotulo: 'Meta', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 4.5v1' },
  { to: '/arquivo', rotulo: 'Arquivo', d: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4' },
  { to: '/desempenho', rotulo: 'Desempenho', curto: 'Desemp.', d: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  { to: '/jornada', rotulo: 'Jornada', d: 'M5 21V4h13l-3 4 3 4H5' },
  { to: '/aprofundamentos', rotulo: 'Aprofundar', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8' },
  { to: '/planos', rotulo: 'Planejamentos', curto: 'Planos', d: 'M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { user, sair, contaTrocada } = useAuth()
  const { planos, plano, selecionar, erro } = usePlano()
  return (
    <div className="app">
      <aside className="lateral-nav">
        <NavLink to="/" className="marca" aria-label="caderninho, início"><Simbolo /><NomeMarca /></NavLink>
        {planos.length > 0 && (
          <label className="seletor-plano">
            <span className="muted">Planejamento</span>
            <select value={plano?.id ?? ''} onChange={(e) => selecionar(e.target.value)}>
              {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        )}
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'ativo' : '')}>
              <I d={n.d} />
              <span className="r-longo">{n.rotulo}</span>
              <span className="r-curto">{n.curto ?? n.rotulo}</span>
            </NavLink>
          ))}
        </nav>
        <div className="usuario">
          {user?.foto && <img src={user.foto} alt="" referrerPolicy="no-referrer" />}
          <div>
            <div className="nome">{user?.nome}</div>
            <div className="muted email">{user?.email}</div>
            <button className="btn-link" onClick={sair}>Sair</button>
          </div>
        </div>
      </aside>
      <main className="conteudo">
        <div className="marca-movel marca"><Simbolo tamanho={30} /><NomeMarca /></div>
        {MODO_DEMO && <p className="aviso">Modo de demonstração: os dados ficam só neste navegador e não aparecem no site com login.</p>}
        {contaTrocada && <p className="aviso">A conta conectada neste navegador mudou para <b>{contaTrocada}</b>. O que aparece agora é dessa conta; os dados da conta anterior continuam salvos nela.</p>}
        <p className="muted conta-movel">Conectado como {user?.email}</p>
        {erro && <p className="erro-faixa">{erro}</p>}
        {children}
      </main>
    </div>
  )
}
