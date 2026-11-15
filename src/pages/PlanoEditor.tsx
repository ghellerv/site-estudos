import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Campo, Vazio } from '../components/ui'
import { siglaDe } from '../lib/caminho'
import { cotas, restantes } from '../lib/meta'
import { usePlano } from '../lib/plan'
import { uid, type CotaTipo, type Disciplina, type Nivel } from '../lib/types'

function CotaCell({ d, onSalvar }: { d: Disciplina; onSalvar: (t: CotaTipo, v: number) => void }) {
  const [v, setV] = useState(String(d.cotaValor || ''))
  useEffect(() => setV(String(d.cotaValor || '')), [d.cotaValor])
  return (
    <span className="cota">
      <select value={d.cotaTipo} onChange={(e) => onSalvar(e.target.value as CotaTipo, e.target.value === 'auto' ? 0 : d.cotaValor || (e.target.value === 'fixo' ? 3 : 10))} aria-label={`Tipo de cota de ${d.nome}`}>
        <option value="auto">Automática</option>
        <option value="fixo">Nº fixo</option>
        <option value="percent">Percentual</option>
      </select>
      {d.cotaTipo !== 'auto' && (
        <>
          <input inputMode="numeric" value={v} aria-label={`Cota de ${d.nome}`} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} onBlur={() => Number(v) !== d.cotaValor && onSalvar(d.cotaTipo, Number(v) || 0)} />
          <span className="muted">{d.cotaTipo === 'percent' ? '%' : 'por meta'}</span>
        </>
      )}
    </span>
  )
}

export default function PlanoEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { plano, planos, souDono, selecionar, discs, salvarPlano, salvarDisc, excluirDisc, carregando } = usePlano()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [porMeta, setPorMeta] = useState('30')
  const [limite, setLimite] = useState('80')
  const [salvo, setSalvo] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoNivel, setNovoNivel] = useState<Nivel>('Aprendiz')

  useEffect(() => {
    if (id && plano && plano.id !== id && planos.some((p) => p.id === id)) selecionar(id)
  }, [id, plano, planos, selecionar])
  useEffect(() => {
    if (plano && plano.id === id) {
      setNome(plano.nome)
      setEmail(plano.studentEmail)
      setPorMeta(String(plano.atividadesPorMeta))
      setLimite(String(plano.limiteReforco))
    }
  }, [plano, id])

  if (carregando || (plano && plano.id !== id && planos.some((p) => p.id === id))) return <p className="muted">Carregando…</p>
  if (!plano || plano.id !== id) return <Vazio titulo="Planejamento não encontrado"><Link className="botao" to="/planos">Voltar</Link></Vazio>
  if (!souDono) return <Vazio titulo="Só quem montou pode editar"><p className="muted">Este planejamento foi montado por {plano.ownerEmail}.</p></Vazio>

  const total = Number(porMeta) || 0
  const q = cotas(discs, plano.atividadesPorMeta)
  const soma = [...q.values()].reduce((s, v) => s + v, 0)
  const mudou = nome !== plano.nome || email.trim().toLowerCase() !== plano.studentEmail || total !== plano.atividadesPorMeta || Number(limite) !== plano.limiteReforco

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    await salvarPlano({ ...plano!, nome: nome.trim() || plano!.nome, studentEmail: email.trim().toLowerCase(), atividadesPorMeta: Math.max(1, total), limiteReforco: Math.min(100, Math.max(0, Number(limite) || 0)) })
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome.trim()) return
    const d: Disciplina = {
      id: uid(), nome: novoNome.trim(), sigla: siglaDe(novoNome), nivel: novoNivel, relevancia: 4, cotaTipo: 'auto', cotaValor: 0,
      paginasPorParte: 20, ativa: true, ordem: Math.max(-1, ...discs.map((x) => x.ordem)) + 1, ciclo: 1, fontes: [], atividades: [],
    }
    await salvarDisc(d)
    setNovoNome('')
    nav(`/planos/${plano!.id}/d/${d.id}`)
  }

  const mover = async (d: Disciplina, delta: number) => {
    const i = discs.indexOf(d)
    const outro = discs[i + delta]
    if (!outro) return
    await salvarDisc({ ...d, ordem: outro.ordem })
    await salvarDisc({ ...outro, ordem: d.ordem })
  }

  return (
    <>
      <header className="titulo-pagina">
        <p className="muted"><Link to="/planos">‹ Meus planejamentos</Link></p>
        <h1>{plano.nome}</h1>
      </header>

      <form className="card form" onSubmit={salvar}>
        <h2>Configurações</h2>
        <div className="linha">
          <Campo rotulo="Nome do planejamento"><input value={nome} onChange={(e) => setNome(e.target.value)} required /></Campo>
          <Campo rotulo="E-mail (Google) de quem vai estudar" dica="Deixe vazio se o planejamento for para você mesmo."><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@gmail.com" /></Campo>
        </div>
        <div className="linha">
          <Campo rotulo="Atividades por meta (semana)"><input inputMode="numeric" value={porMeta} onChange={(e) => setPorMeta(e.target.value.replace(/\D/g, ''))} /></Campo>
          <Campo rotulo="Reforço quando o acerto for menor que (%)" dica="Questões e testes abaixo disso voltam na meta seguinte."><input inputMode="numeric" value={limite} onChange={(e) => setLimite(e.target.value.replace(/\D/g, ''))} /></Campo>
        </div>
        <div className="acoes"><button className="primario" disabled={!mudou}>Salvar configurações</button>{salvo && <span className="tag st-ok">Salvo</span>}</div>
      </form>

      <h2 className="secao">Disciplinas</h2>
      {discs.length === 0 ? (
        <p className="muted pad">Nenhuma disciplina ainda. Adicione a primeira abaixo.</p>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela discs">
            <thead><tr><th>Ordem</th><th>Disciplina</th><th>Nível</th><th>Caminho</th><th>Cota semanal</th><th>Na próxima meta</th><th>Ativa</th><th></th></tr></thead>
            <tbody>
              {discs.map((d, i) => (
                <tr key={d.id}>
                  <td className="nowrap">
                    <button className="icone" disabled={i === 0} onClick={() => mover(d, -1)} aria-label={`Subir ${d.nome}`}>↑</button>
                    <button className="icone" disabled={i === discs.length - 1} onClick={() => mover(d, 1)} aria-label={`Descer ${d.nome}`}>↓</button>
                  </td>
                  <td><Link to={`/planos/${plano.id}/d/${d.id}`}><b>{d.nome}</b></Link> <span className="muted">{d.sigla}</span></td>
                  <td><span className={`tag nivel-${d.nivel.toLowerCase()}`}>{d.nivel}</span></td>
                  <td>{d.atividades.length === 0 ? <Link to={`/planos/${plano.id}/d/${d.id}`}>Montar caminho</Link> : <>{restantes(d)} de {d.atividades.length} restantes{d.nivel === 'Expert' && d.ciclo > 1 ? ` · ${d.ciclo}º ciclo` : ''}</>}</td>
                  <td><CotaCell d={d} onSalvar={(t, v) => salvarDisc({ ...d, cotaTipo: t, cotaValor: v })} /></td>
                  <td><b>{q.get(d.id) ?? 0}</b></td>
                  <td><input type="checkbox" checked={d.ativa} onChange={(e) => salvarDisc({ ...d, ativa: e.target.checked })} aria-label={`${d.nome} ativa`} /></td>
                  <td><button className="icone perigo" aria-label={`Excluir ${d.nome}`} onClick={() => window.confirm(`Excluir a disciplina "${d.nome}" e o caminho dela? As metas já feitas continuam no arquivo.`) && excluirDisc(d.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {discs.length > 0 && (
        <p className={soma === plano.atividadesPorMeta ? 'muted pad' : 'aviso'}>
          Prévia da próxima meta: <b>{soma}</b> atividades{soma !== plano.atividadesPorMeta ? ` (o planejamento pede ${plano.atividadesPorMeta}; ajuste as cotas fixas e percentuais ou o total).` : '.'}{' '}
          Disciplinas com cota automática dividem por igual o que sobra depois das cotas fixas e percentuais.
        </p>
      )}

      <form className="card form" onSubmit={adicionar}>
        <h2>Adicionar disciplina</h2>
        <div className="linha fim">
          <label className="campo cresce"><span>Nome</span><input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: Direito Constitucional" /></label>
          <label className="campo"><span>Nível</span>
            <select value={novoNivel} onChange={(e) => setNovoNivel(e.target.value as Nivel)}>
              <option value="Aprendiz">Aprendiz (do zero, com PDFs)</option>
              <option value="Expert">Expert (já estudada, por blocos)</option>
            </select>
          </label>
          <button className="primario" disabled={!novoNome.trim()}>Adicionar</button>
        </div>
      </form>
    </>
  )
}
