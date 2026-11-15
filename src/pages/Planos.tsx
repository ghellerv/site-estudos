import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePlano } from '../lib/plan'

export default function Planos() {
  const { user, sair } = useAuth()
  const { planos, plano, selecionar, criarPlano, excluirPlano, duplicarPlano, carregando } = usePlano()
  const [nome, setNome] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const nav = useNavigate()

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setOcupado(true)
    try {
      const p = await criarPlano(nome.trim())
      nav(`/planos/${p.id}`)
    } finally {
      setOcupado(false)
    }
  }
  const com = async (f: () => Promise<void>) => {
    setOcupado(true)
    try {
      await f()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <header className="titulo-pagina">
        <h1>Meus planejamentos</h1>
        <p className="muted">Monte um planejamento para você ou para outra pessoa estudar, e escolha em qual deles estudar agora.</p>
      </header>

      {carregando ? (
        <p className="muted">Carregando…</p>
      ) : planos.length === 0 ? (
        <p className="muted pad">Você ainda não tem nenhum planejamento. Crie o primeiro abaixo.</p>
      ) : (
        <section className="grade-planos">
          {planos.map((p) => {
            const dono = p.ownerUid === user?.uid
            return (
              <article key={p.id} className={`card${p.id === plano?.id ? ' atual' : ''}`}>
                <div className="card-linha">
                  <h2>{p.nome}</h2>
                  {p.id === plano?.id && <span className="tag st-ok">Estudando neste</span>}
                </div>
                <p className="muted">
                  {dono ? 'Montado por você' : `Montado por ${p.ownerEmail}`}
                  {dono && p.studentEmail ? ` · para ${p.studentEmail}` : ''} · {p.atividadesPorMeta} atividades por meta
                </p>
                <div className="acoes">
                  {p.id !== plano?.id && <button className="primario" onClick={() => { selecionar(p.id); nav('/') }}>Estudar neste</button>}
                  {dono && <Link className="botao" to={`/planos/${p.id}`}>Editar</Link>}
                  {dono && <button disabled={ocupado} onClick={() => com(() => duplicarPlano(p.id))}>Duplicar</button>}
                  {dono && (
                    <button className="perigo" disabled={ocupado} onClick={() => window.confirm(`Excluir o planejamento "${p.nome}" com todas as metas e registros? Isso não pode ser desfeito.`) && com(() => excluirPlano(p.id))}>
                      Excluir
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}

      <form className="card form" onSubmit={criar}>
        <h2>Novo planejamento</h2>
        <div className="linha fim">
          <label className="campo cresce"><span>Nome</span><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: SEFAZ SC Auditor Fiscal" /></label>
          <button className="primario" disabled={ocupado || !nome.trim()}>Criar e montar</button>
        </div>
      </form>
      <p className="muted conta-movel">Conectado como {user?.email} <button onClick={sair}>Sair</button></p>
    </>
  )
}
