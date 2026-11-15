import { useMemo, useState } from 'react'
import { PctTag, Vazio } from '../components/ui'
import { DIA, fmtMin, fmtPct, lancamentos, pct } from '../lib/meta'
import { usePlano } from '../lib/plan'
import { MOTIVOS } from '../lib/types'

export default function Desempenho() {
  const { plano, metas, aprofs } = usePlano()
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [disc, setDisc] = useState('')
  const todos = useMemo(() => lancamentos(metas, aprofs), [metas, aprofs])
  if (!plano || metas.length === 0) return <Vazio titulo="Sem dados ainda"><p className="muted">O desempenho aparece conforme você finaliza as atividades.</p></Vazio>

  const nomes = [...new Map(todos.map((l) => [l.discId, l.discNome])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  const ls = todos.filter((l) => (!de || l.metaN >= Number(de)) && (!ate || l.metaN <= Number(ate)) && (!disc || l.discId === disc))
  const soma = (f: (l: (typeof ls)[number]) => number, arr = ls) => arr.reduce((s, l) => s + f(l), 0)
  const questoes = soma((l) => l.questoes)
  const acertos = soma((l) => l.acertos)
  const minutos = soma((l) => l.minutos)
  const metasNoFiltro = metas.filter((m) => (!de || m.numero >= Number(de)) && (!ate || m.numero <= Number(ate)))
  const ini = metasNoFiltro[0]?.inicio ?? Date.now()
  const fim = metasNoFiltro[metasNoFiltro.length - 1]?.concluidaEm ?? Date.now()
  const dias = Math.max(1, Math.ceil((fim - ini) / DIA))
  const erros = MOTIVOS.map((m) => ({ m, n: soma((l) => l.erros?.[m] ?? 0) }))
  const totalErros = questoes - acertos
  const naoEsp = Math.max(0, totalErros - erros.reduce((s, e) => s + e.n, 0))

  const linhas = nomes
    .filter(([id]) => !disc || id === disc)
    .map(([id, nome]) => {
      const d = ls.filter((l) => l.discId === id)
      const por = (o: string) => d.filter((l) => l.origem === o)
      const ativ = por('caminho')
      return {
        id, nome,
        questoes: soma((l) => l.questoes, d),
        acertos: soma((l) => l.acertos, d),
        media: ativ.length ? soma((l) => l.minutos, ativ) / ativ.length : 0,
        reforco: soma((l) => l.minutos, por('reforco')),
        aprof: soma((l) => l.minutos, por('aprofundamento')),
        total: soma((l) => l.minutos, d),
      }
    })
    .filter((l) => l.total > 0)

  return (
    <>
      <header className="titulo-pagina">
        <h1>Desempenho acumulado</h1>
        <p className="muted">Desempenho por disciplina, questões resolvidas e tempo estudado em {plano.nome}.</p>
      </header>
      <div className="filtros">
        <select value={de} onChange={(e) => setDe(e.target.value)} aria-label="Da meta">
          <option value="">Desde a 1ª meta</option>
          {metas.map((m) => <option key={m.id} value={m.numero}>Da {m.numero}ª meta</option>)}
        </select>
        <select value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Até a meta">
          <option value="">Até a meta atual</option>
          {metas.map((m) => <option key={m.id} value={m.numero}>Até a {m.numero}ª meta</option>)}
        </select>
        <select value={disc} onChange={(e) => setDisc(e.target.value)} aria-label="Disciplina">
          <option value="">Todas as disciplinas</option>
          {nomes.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </select>
      </div>
      <section className="kpis">
        <article className="kpi k1"><span>Desempenho atingido</span><b>{fmtPct(pct(acertos, questoes))}</b></article>
        <article className="kpi k2"><span>Horas estudadas</span><b>{fmtMin(minutos)}</b></article>
        <article className="kpi k3"><span>Questões resolvidas</span><b>{questoes.toLocaleString('pt-BR')}</b></article>
        <article className="kpi k4"><span>Média diária de estudo</span><b>{fmtMin(minutos / dias)}</b></article>
      </section>
      {linhas.length === 0 ? (
        <p className="muted pad">Nenhuma atividade finalizada nesse filtro.</p>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Disciplina</th><th>Questões</th><th>Acertos</th><th>Desempenho</th><th>Média por atividade</th><th>Reforços</th><th>Aprofundamentos</th><th>Total</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td><b>{l.nome}</b></td>
                  <td>{l.questoes || '-'}</td>
                  <td>{l.questoes ? l.acertos : '-'}</td>
                  <td><PctTag valor={pct(l.acertos, l.questoes)} limite={plano.limiteReforco} /></td>
                  <td>{l.media ? fmtMin(l.media) : '-'}</td>
                  <td>{l.reforco ? fmtMin(l.reforco) : '-'}</td>
                  <td>{l.aprof ? fmtMin(l.aprof) : '-'}</td>
                  <td>{fmtMin(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalErros > 0 && (
        <section className="card">
          <h2>Padrão de erros</h2>
          <p className="muted">{totalErros} erros no período, pelos motivos registrados.</p>
          {[...erros, { m: 'Não especificado', n: naoEsp }].map((e) => (
            <div className="erro-linha" key={e.m}>
              <span>{e.m}</span>
              <div className="barra fina"><div style={{ width: `${(e.n / totalErros) * 100}%` }} /></div>
              <b>{e.n}</b>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
