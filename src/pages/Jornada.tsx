import { useState } from 'react'
import { Barra, TipoTag, Vazio } from '../components/ui'
import { fmtMin } from '../lib/meta'
import { usePlano } from '../lib/plan'

export default function Jornada() {
  const { plano, discs } = usePlano()
  const [aberta, setAberta] = useState('')
  if (!plano || discs.length === 0) return <Vazio titulo="Sem disciplinas"><p className="muted">A jornada mostra o caminho de cada disciplina do planejamento.</p></Vazio>
  const total = discs.reduce((s, d) => s + d.atividades.length, 0)
  const feitas = discs.reduce((s, d) => s + d.atividades.filter((a) => a.distribuida).length, 0)
  const geral = total ? (feitas / total) * 100 : 0
  return (
    <>
      <header className="titulo-pagina">
        <h1>Jornada</h1>
        <p className="muted">Quanto do caminho de cada disciplina já entrou nas suas metas.</p>
      </header>
      <section className="card destaque">
        <div className="card-linha"><b>Progresso geral do planejamento</b><b>{Math.round(geral)}%</b></div>
        <p className="muted">{discs.length} disciplinas</p>
        <Barra valor={geral} />
      </section>
      <section className="card sem-pad">
        {discs.map((d) => {
          const n = d.atividades.filter((a) => a.distribuida).length
          const p = d.atividades.length ? (n / d.atividades.length) * 100 : 0
          return (
            <div key={d.id} className="jornada-linha">
              <button className="jornada-topo" onClick={() => setAberta(aberta === d.id ? '' : d.id)} aria-expanded={aberta === d.id}>
                <span className="j-nome"><b>{d.nome}</b>{!d.ativa && <span className="tag">Pausada</span>}</span>
                <span className={`tag nivel-${d.nivel.toLowerCase()}`}>{d.nivel}{d.nivel === 'Expert' && d.ciclo > 1 ? ` · ${d.ciclo}º ciclo` : ''}</span>
                <span className="j-pct">{Math.round(p)}%</span>
                <span className="j-barra"><Barra valor={p} /></span>
                <span aria-hidden>{aberta === d.id ? '▴' : '▾'}</span>
              </button>
              {aberta === d.id && (
                <ol className="caminho-lista">
                  {d.atividades.length === 0 && <li className="muted">Caminho ainda não gerado.</li>}
                  {d.atividades.map((a) => (
                    <li key={a.id} className={a.distribuida ? 'feita' : ''}>
                      <TipoTag tipo={a.tipo} /> <span>{a.titulo}</span>
                      <span className="muted">{a.pagIni && a.pagFim ? `p. ${a.pagIni}-${a.pagFim} · ` : ''}{fmtMin(a.minutos)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )
        })}
      </section>
    </>
  )
}
