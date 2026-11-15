import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AprofLista } from '../components/AprofLista'
import { AtividadePanel } from '../components/AtividadePanel'
import { Barra, Estrelas, PctTag, TipoTag, Vazio } from '../components/ui'
import { useAuth } from '../lib/auth'
import { cotas, feitas, fmtData, fmtMin, metaCompleta, pct, statusMeta } from '../lib/meta'
import { usePlano } from '../lib/plan'
import { TIPOS, temQuestoes } from '../lib/types'

type Aba = 'ativ' | 'ref' | 'aprof'
const pl = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`

export default function MetaPage() {
  const { n } = useParams()
  const { user } = useAuth()
  const { plano, souDono, metas, metaAtual, discs, aprofs, iniciarProximaMeta, adiarMeta, carregando } = usePlano()
  const meta = n ? metas.find((m) => m.numero === Number(n)) : metaAtual
  const [aba, setAba] = useState<Aba>('ativ')
  const [fTipo, setFTipo] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const previa = useMemo(() => (plano ? [...cotas(discs, plano.atividadesPorMeta).values()].reduce((s, v) => s + v, 0) : 0), [discs, plano])

  if (carregando) return <p className="muted">Carregando…</p>
  if (!plano)
    return (
      <Vazio titulo="Nenhum planejamento ainda">
        <p className="muted">Crie um planejamento ou peça para quem montou o seu incluir o seu e-mail ({user?.email}).</p>
        <Link className="botao primario" to="/planos">Ir para Meus planejamentos</Link>
      </Vazio>
    )

  const iniciar = async () => {
    setOcupado(true)
    try {
      await iniciarProximaMeta()
      setAba('ativ')
    } finally {
      setOcupado(false)
    }
  }

  if (!meta)
    return (
      <Vazio titulo={n ? 'Meta não encontrada' : `Tudo pronto para começar: ${plano.nome}`}>
        {!n && (
          <>
            <p className="muted">
              {previa > 0
                ? `A 1ª meta terá ${previa} atividades, misturando as disciplinas do planejamento.`
                : 'O planejamento ainda não tem disciplinas com atividades.'}
            </p>
            {previa > 0 && <button className="primario" disabled={ocupado} onClick={iniciar}>{ocupado ? 'Montando…' : 'Iniciar a 1ª meta'}</button>}
            {souDono && <Link className="botao" to={`/planos/${plano.id}`}>Editar o planejamento</Link>}
          </>
        )}
      </Vazio>
    )

  const ehAtual = meta === metaAtual
  const agora = Date.now()
  const st = statusMeta(meta, agora)
  const principais = meta.itens.filter((i) => i.origem === 'caminho')
  const reforcos = meta.itens.filter((i) => i.origem === 'reforco')
  const aprofsDaMeta = aprofs.filter(
    (a) => a.concluidaNaMeta === meta.numero || (ehAtual && a.status === 'pendente' && a.metaN !== null && a.metaN <= meta.numero),
  )
  const lista = (aba === 'ref' ? reforcos : principais).filter((i) => (!fTipo || i.tipo === fTipo) && (!fStatus || i.status === fStatus))
  const aberto = meta.itens.find((i) => i.id === abertoId)
  const completa = metaCompleta(meta)
  const nDiscs = new Set(meta.itens.map((i) => i.discId)).size
  const navegar = (d: number) => {
    const i = lista.findIndex((x) => x.id === abertoId)
    const prox = lista[i + d]
    if (prox) setAbertoId(prox.id)
  }

  return (
    <>
      <header className="titulo-pagina">
        <h1>{ehAtual ? `Olá, ${user?.nome.split(' ')[0] || 'estudante'}!` : `${meta.numero}ª Meta`}</h1>
        <p className="muted">{ehAtual ? 'Acompanhe seu progresso e veja o que falta para concluir a meta.' : <Link to="/arquivo">‹ Voltar ao arquivo</Link>}</p>
      </header>

      <section className="cards-meta">
        <article className="card destaque">
          <div className="card-linha">
            <span className="rotulo-meta">{meta.numero}ª Meta</span>
            <span className="muted">{plano.nome} · Início em {fmtData(meta.inicio)}</span>
          </div>
          <div className="contagem"><b>{feitas(meta)}</b> / {meta.itens.length} atividades</div>
          <Barra valor={meta.itens.length ? (feitas(meta) / meta.itens.length) * 100 : 0} />
          <div className="muted resumo-meta">
            {pl(meta.itens.length - feitas(meta), 'pendente')} | {pl(reforcos.length, 'reforço')} | {pl(aprofsDaMeta.length, 'aprofundamento')} | {pl(nDiscs, 'disciplina')}
          </div>
        </article>
        <article className="card">
          <div className="card-linha">
            <span className={`tag st-${st.status === 'Em dia' ? 'ok' : st.status === 'Adiada' ? 'alerta' : 'ruim'}`}>
              {st.status}{st.diasAtraso > 0 ? ` · ${st.diasAtraso} ${st.diasAtraso === 1 ? 'dia' : 'dias'}` : ''}
            </span>
            <span className="muted">{meta.concluidaEm ? `Concluída em ${fmtData(meta.concluidaEm)}` : `Prazo: ${fmtData(meta.prazo)}`}</span>
          </div>
          {ehAtual ? (
            <>
              <div className="proxima">
                <b>{meta.numero + 1}ª Meta</b>
                <span className="muted">{completa ? 'Liberada' : 'Bloqueada até concluir esta meta'}</span>
              </div>
              <div className="acoes">
                {meta.adiamentos === 0 && !completa && <button disabled={ocupado} onClick={adiarMeta}>Adiar meta (+1 dia)</button>}
                <button className="primario" disabled={!completa || ocupado} onClick={iniciar}>{ocupado ? 'Montando…' : `Iniciar a ${meta.numero + 1}ª meta`}</button>
              </div>
            </>
          ) : (
            <p className="muted">Meta do arquivo. Você ainda pode abrir as atividades e corrigir os registros.</p>
          )}
        </article>
      </section>

      <div className="abas-filtros">
        <div className="abas">
          <button className={aba === 'ativ' ? 'ativa' : ''} onClick={() => setAba('ativ')}>Atividades <b>{principais.length}</b></button>
          <button className={aba === 'ref' ? 'ativa' : ''} onClick={() => setAba('ref')}>Reforços <b>{reforcos.length}</b></button>
          <button className={aba === 'aprof' ? 'ativa' : ''} onClick={() => setAba('aprof')}>Aprofundamentos <b>{aprofsDaMeta.length}</b></button>
        </div>
        {aba !== 'aprof' && (
          <div className="filtros">
            <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} aria-label="Filtrar por tipo">
              <option value="">Todos os tipos</option>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filtrar por status">
              <option value="">Todos os status</option>
              <option value="pendente">Pendentes</option>
              <option value="cumprida">Cumpridas</option>
              <option value="ignorada">Ignoradas</option>
            </select>
          </div>
        )}
      </div>

      {aba === 'aprof' ? (
        <section className="card sem-pad">
          <AprofLista itens={aprofsDaMeta} vazio="Nenhum aprofundamento nesta meta. Crie um na tela Aprofundar." />
        </section>
      ) : lista.length === 0 ? (
        <p className="muted pad">{aba === 'ref' ? 'Nenhum reforço nesta meta. Eles aparecem quando uma atividade de questões fica abaixo do limite.' : 'Nenhuma atividade com esses filtros.'}</p>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela atividades">
            <thead>
              <tr><th></th><th>#</th><th>Disciplina</th><th>Tipo</th><th>Título</th><th>Relevância</th><th>Tempo</th><th>Desempenho</th><th>Código</th></tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <tr key={i.id} className={`sit-${i.status}`} onClick={() => setAbertoId(i.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setAbertoId(i.id)}>
                  <td className="c-ponto"><span className={`ponto ${i.status}`} title={i.status} /></td>
                  <td className="c-num">{meta.itens.indexOf(i) + 1}</td>
                  <td className="c-disc">{i.discNome}</td>
                  <td className="c-tipo"><TipoTag tipo={i.tipo} /></td>
                  <td className="c-titulo">{i.titulo}{i.tipo === 'Teoria' && i.pagIni && i.pagFim ? <span className="muted"> · p. {i.pagIni}-{i.pagFim}</span> : null}</td>
                  <td className="c-rel"><Estrelas n={i.relevancia} /></td>
                  <td className="c-tempo">{fmtMin(i.status === 'cumprida' ? i.minutos : i.minutosPrev)}</td>
                  <td className="c-des">{i.status === 'cumprida' && temQuestoes(i.tipo) ? <PctTag valor={pct(i.acertos, i.questoes)} limite={plano.limiteReforco} /> : i.status === 'ignorada' ? <span className="muted">ignorada</span> : <span className="muted">-</span>}</td>
                  <td className="c-cod muted">{i.codigo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aberto && <AtividadePanel meta={meta} item={aberto} onClose={() => setAbertoId(null)} onNav={navegar} />}
    </>
  )
}
