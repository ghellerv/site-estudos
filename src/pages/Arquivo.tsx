import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Vazio } from '../components/ui'
import { statusMeta } from '../lib/meta'
import { usePlano } from '../lib/plan'

export default function Arquivo() {
  const { metas, aprofs, plano } = usePlano()
  const [busca, setBusca] = useState('')
  if (!plano || metas.length === 0) return <Vazio titulo="Arquivo vazio"><p className="muted">As metas aparecem aqui depois de iniciadas.</p></Vazio>
  const agora = Date.now()
  const q = busca.trim().toLowerCase()
  const lista = [...metas].reverse().filter((m) => !q || m.itens.some((i) => i.codigo.toLowerCase().includes(q) || i.titulo.toLowerCase().includes(q)))
  return (
    <>
      <header className="titulo-pagina">
        <h1>Arquivo</h1>
        <p className="muted">Todas as metas do planejamento {plano.nome}.</p>
      </header>
      <input className="busca" placeholder="Buscar pelo código ou título da atividade" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <section className="grade-metas">
        {lista.map((m) => {
          const st = statusMeta(m, agora)
          const c = (s: string) => m.itens.filter((i) => i.status === s).length
          const ref = m.itens.filter((i) => i.origem === 'reforco').length
          const apr = aprofs.filter((a) => a.concluidaNaMeta === m.numero).length
          return (
            <Link key={m.id} to={`/meta/${m.numero}`} className={`card meta-card${m === metas[metas.length - 1] ? ' atual' : ''}`}>
              <div className="card-linha">
                <b>{m.numero}ª Meta</b>
                <span className={`tag st-${st.status === 'Em dia' ? 'ok' : st.status === 'Adiada' ? 'alerta' : 'ruim'}`}>{m.concluidaEm ? st.status : `Em andamento · ${st.status}`}</span>
              </div>
              <div className="card-linha">
                <span>{m.itens.length} atividades</span>
                <span className="muted">{st.diasAtraso > 0 ? `+${st.diasAtraso} ${st.diasAtraso === 1 ? 'dia' : 'dias'}` : '0 dias de atraso'}</span>
              </div>
              <div className="trio">
                <span><i className="ponto pendente" /> {c('pendente')}</span>
                <span><i className="ponto cumprida" /> {c('cumprida')}</span>
                <span><i className="ponto ignorada" /> {c('ignorada')}</span>
              </div>
              <div className="muted centro">{ref} reforços · {apr} aprofundamentos</div>
            </Link>
          )
        })}
      </section>
      {lista.length === 0 && <p className="muted pad">Nenhuma meta tem atividade com esse código ou título.</p>}
    </>
  )
}
