import { useAuth } from '../lib/auth'

export default function Inicio() {
  const { user, sair } = useAuth()
  const primeiroNome = user?.displayName?.split(' ')[0] ?? 'estudante'

  return (
    <div className="app">
      <header className="topo">
        <span className="marca">📚 Site de Estudos</span>
        <div className="usuario">
          {user?.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />}
          <button className="btn-link" onClick={sair}>Sair</button>
        </div>
      </header>

      <main className="conteudo">
        <h1>Olá, {primeiroNome}!</h1>
        <p className="muted">Sua conta está pronta. As próximas partes do site aparecem aqui.</p>

        <section className="cards">
          <article className="card">
            <h2>Ciclo da semana</h2>
            <p className="muted">Leituras, mapeamentos, cadernos e revisões de 45 a 90 minutos.</p>
            <span className="tag">Em breve</span>
          </article>
          <article className="card">
            <h2>Planos de estudo</h2>
            <p className="muted">Monte um plano a partir de um edital ou siga um plano que montaram para você.</p>
            <span className="tag">Em breve</span>
          </article>
          <article className="card">
            <h2>Desempenho</h2>
            <p className="muted">Acertos por disciplina e assunto, e revisões reagendadas pelo resultado.</p>
            <span className="tag">Em breve</span>
          </article>
        </section>
      </main>
    </div>
  )
}
