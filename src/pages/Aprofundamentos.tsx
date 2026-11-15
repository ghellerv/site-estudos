import { useState } from 'react'
import { AprofLista } from '../components/AprofLista'
import { Campo, Vazio } from '../components/ui'
import { registroVazio } from '../lib/meta'
import { usePlano } from '../lib/plan'
import { TIPOS, uid, type Tipo } from '../lib/types'

export default function Aprofundamentos() {
  const { plano, discs, aprofs, metaAtual, salvarAprof } = usePlano()
  const [discId, setDiscId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [tipo, setTipo] = useState<Tipo>('Questões')
  const [orientacao, setOrientacao] = useState('')
  const [link, setLink] = useState('')
  const [destino, setDestino] = useState<'backlog' | 'proxima'>('backlog')
  const [salvando, setSalvando] = useState(false)
  if (!plano || discs.length === 0) return <Vazio titulo="Sem disciplinas"><p className="muted">Os aprofundamentos são criados dentro de uma disciplina do planejamento.</p></Vazio>
  const proxima = (metaAtual?.numero ?? 0) + 1
  const d = discs.find((x) => x.id === discId)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!d || !assunto.trim()) return
    setSalvando(true)
    try {
      await salvarAprof({
        id: uid(), discId: d.id, discNome: d.nome, assunto: assunto.trim(), tipo, orientacao: orientacao.trim() || undefined, link: link.trim() || undefined,
        metaN: destino === 'proxima' ? proxima : null, status: 'pendente', criadoEm: Date.now(), ...registroVazio(),
      })
      setAssunto('')
      setOrientacao('')
      setLink('')
    } finally {
      setSalvando(false)
    }
  }

  const pend = aprofs.filter((a) => a.status === 'pendente')
  return (
    <>
      <header className="titulo-pagina">
        <h1>Aprofundamentos</h1>
        <p className="muted">Atividades extras que você mesma cria. Faça quando quiser, ou envie para a próxima meta.</p>
      </header>
      <form className="card form" onSubmit={criar}>
        <h2>Novo aprofundamento</h2>
        <div className="linha">
          <Campo rotulo="Disciplina">
            <select value={discId} onChange={(e) => setDiscId(e.target.value)} required>
              <option value="">Escolha…</option>
              {discs.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
          </Campo>
        </div>
        <Campo rotulo="Assunto">
          <input value={assunto} onChange={(e) => setAssunto(e.target.value)} list="assuntos-disc" required placeholder="Ex.: Controle de constitucionalidade" />
          <datalist id="assuntos-disc">{d?.fontes.map((f) => <option key={f.id} value={f.nome} />)}</datalist>
        </Campo>
        <Campo rotulo="Orientação (opcional)"><input value={orientacao} onChange={(e) => setOrientacao(e.target.value)} placeholder="O que fazer nesta atividade" /></Campo>
        <Campo rotulo="Link (opcional)"><input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></Campo>
        <fieldset>
          <legend>Quando fazer</legend>
          <label><input type="radio" checked={destino === 'backlog'} onChange={() => setDestino('backlog')} /> Deixar no backlog</label>
          <label><input type="radio" checked={destino === 'proxima'} onChange={() => setDestino('proxima')} /> Na próxima meta ({proxima}ª)</label>
        </fieldset>
        <div><button className="primario" disabled={salvando || !d || !assunto.trim()}>{salvando ? 'Criando…' : 'Criar aprofundamento'}</button></div>
      </form>

      <h2 className="secao">Backlog</h2>
      <section className="card sem-pad"><AprofLista itens={pend.filter((a) => a.metaN === null)} vazio="Nada no backlog." /></section>
      <h2 className="secao">Agendados para uma meta</h2>
      <section className="card sem-pad"><AprofLista itens={pend.filter((a) => a.metaN !== null)} vazio="Nenhum aprofundamento agendado." /></section>
      <h2 className="secao">Concluídos</h2>
      <section className="card sem-pad"><AprofLista itens={aprofs.filter((a) => a.status === 'cumprida')} vazio="Nenhum aprofundamento concluído ainda." /></section>
    </>
  )
}
