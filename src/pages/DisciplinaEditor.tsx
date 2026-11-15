import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Campo, Modal, TipoTag, Vazio } from '../components/ui'
import { atividadeManual, parseLote, regenerar } from '../lib/caminho'
import { comandoPadrao, fmtMin } from '../lib/meta'
import { usePlano } from '../lib/plan'
import { TIPOS, uid, type Atividade, type Disciplina, type Fonte, type Nivel, type Tipo } from '../lib/types'

const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(/\D/g, '')) || undefined)

function AtividadeModal({ a, onSalvar, onClose }: { a: Atividade; onSalvar: (a: Atividade) => void; onClose: () => void }) {
  const [x, setX] = useState(a)
  const set = (p: Partial<Atividade>) => setX((v) => ({ ...v, ...p }))
  return (
    <Modal
      titulo="Editar atividade"
      onClose={onClose}
      rodape={<><button onClick={onClose}>Cancelar</button><button className="primario" disabled={!x.titulo.trim()} onClick={() => onSalvar({ ...x, editada: true })}>Aplicar</button></>}
    >
      <div className="form">
        <div className="linha">
          <Campo rotulo="Tipo"><select value={x.tipo} onChange={(e) => set({ tipo: e.target.value as Tipo })}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></Campo>
          <Campo rotulo="Tempo previsto (min)"><input inputMode="numeric" value={x.minutos || ''} onChange={(e) => set({ minutos: num(e.target.value) ?? 0 })} /></Campo>
        </div>
        <Campo rotulo="Título"><input value={x.titulo} onChange={(e) => set({ titulo: e.target.value })} /></Campo>
        <div className="linha">
          <Campo rotulo="Da página"><input inputMode="numeric" value={x.pagIni ?? ''} onChange={(e) => set({ pagIni: num(e.target.value) })} /></Campo>
          <Campo rotulo="Até a página"><input inputMode="numeric" value={x.pagFim ?? ''} onChange={(e) => set({ pagFim: num(e.target.value) })} /></Campo>
        </div>
        <Campo rotulo="Link do material (PDF)"><input type="url" value={x.link ?? ''} onChange={(e) => set({ link: e.target.value || undefined })} placeholder="https://drive.google.com/…" /></Campo>
        <Campo rotulo="Link do caderno de questões"><input type="url" value={x.caderno ?? ''} onChange={(e) => set({ caderno: e.target.value || undefined })} placeholder="https://www.tecconcursos.com.br/…" /></Campo>
        <Campo rotulo="Assuntos" dica="Separe por ponto e vírgula."><input value={x.assuntos ?? ''} onChange={(e) => set({ assuntos: e.target.value || undefined })} /></Campo>
        <Campo rotulo="Comando" dica="Deixe vazio para usar o texto padrão mostrado abaixo.">
          <textarea rows={5} value={x.comando ?? ''} onChange={(e) => set({ comando: e.target.value || undefined })} placeholder={comandoPadrao({ ...x, minutosPrev: x.minutos })} />
        </Campo>
      </div>
    </Modal>
  )
}

export default function DisciplinaEditor() {
  const { id, discId } = useParams()
  const { plano, souDono, discs, salvarDisc, carregando, selecionar, planos } = usePlano()
  const original = discs.find((x) => x.id === discId)
  const [d, setD] = useState<Disciplina | null>(null)
  const [sujo, setSujo] = useState(false)
  const [fontesMudaram, setFontesMudaram] = useState(false)
  const [lote, setLote] = useState('')
  const [mostrarLote, setMostrarLote] = useState(false)
  const [editando, setEditando] = useState<Atividade | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (id && plano && plano.id !== id && planos.some((p) => p.id === id)) selecionar(id)
  }, [id, plano, planos, selecionar])
  useEffect(() => {
    if (original && (!d || d.id !== original.id)) setD(original)
  }, [original, d])
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => sujo && e.preventDefault()
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [sujo])

  if (carregando) return <p className="muted">Carregando…</p>
  if (!plano || plano.id !== id || !original || !d) return <Vazio titulo="Disciplina não encontrada"><Link className="botao" to="/planos">Voltar</Link></Vazio>
  if (!souDono) return <Vazio titulo="Só quem montou pode editar" />

  const aprendiz = d.nivel === 'Aprendiz'
  const mud = (p: Partial<Disciplina>, fontes = false) => {
    setD({ ...d, ...p })
    setSujo(true)
    setMsg('')
    if (fontes) setFontesMudaram(true)
  }
  const mudFonte = (i: number, p: Partial<Fonte>) => mud({ fontes: d.fontes.map((f, j) => (j === i ? { ...f, ...p } : f)) }, true)
  const moverFonte = (i: number, delta: number) => {
    const fs = [...d.fontes]
    const [f] = fs.splice(i, 1)
    fs.splice(i + delta, 0, f)
    mud({ fontes: fs }, true)
  }
  const moverAtiv = (i: number, delta: number) => {
    const as = [...d.atividades]
    const [a] = as.splice(i, 1)
    as.splice(i + delta, 0, a)
    mud({ atividades: as })
  }

  async function salvar(gerar: boolean) {
    setSalvando(true)
    try {
      const limpo = { ...d!, fontes: d!.fontes.filter((f) => f.nome.trim()) }
      const final = gerar ? { ...limpo, atividades: regenerar(limpo) } : limpo
      await salvarDisc(final)
      setD(final)
      setSujo(false)
      if (gerar) setFontesMudaram(false)
      setMsg(gerar ? `Caminho gerado: ${final.atividades.length} atividades.` : 'Alterações salvas.')
    } finally {
      setSalvando(false)
    }
  }

  const adicionarLote = () => {
    const novas = parseLote(lote, d.nivel)
    if (!novas.length) return
    mud({ fontes: [...d.fontes.filter((f) => f.nome.trim()), ...novas] }, true)
    setLote('')
    setMostrarLote(false)
  }

  const totalMin = d.atividades.reduce((s, a) => s + a.minutos, 0)
  const porTipo = TIPOS.map((t) => [t, d.atividades.filter((a) => a.tipo === t).length] as const).filter(([, n]) => n > 0)
  const distribuidas = d.atividades.filter((a) => a.distribuida).length

  return (
    <>
      <header className="titulo-pagina">
        <p className="muted"><Link to={`/planos/${plano.id}`}>‹ {plano.nome}</Link></p>
        <h1>{d.nome}</h1>
      </header>

      <section className="card form">
        <h2>Dados da disciplina</h2>
        <div className="linha">
          <Campo rotulo="Nome"><input value={d.nome} onChange={(e) => mud({ nome: e.target.value })} /></Campo>
          <Campo rotulo="Sigla" dica="Usada no código das atividades."><input value={d.sigla} onChange={(e) => mud({ sigla: e.target.value.toUpperCase().slice(0, 6) })} /></Campo>
        </div>
        <div className="linha">
          <Campo rotulo="Nível" dica={aprendiz ? 'Do zero: teoria, mapeamento, questões, revisão e teste.' : 'Já estudada: só questões, revisão e teste, por blocos de tópicos.'}>
            <select value={d.nivel} onChange={(e) => mud({ nivel: e.target.value as Nivel }, true)}>
              <option>Aprendiz</option>
              <option>Expert</option>
            </select>
          </Campo>
          <Campo rotulo="Relevância (1 a 5 estrelas)">
            <select value={d.relevancia} onChange={(e) => mud({ relevancia: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
          </Campo>
          {aprendiz && (
            <Campo rotulo="Páginas por atividade de teoria" dica="Cada PDF é dividido em partes desse tamanho.">
              <input inputMode="numeric" value={d.paginasPorParte || ''} onChange={(e) => mud({ paginasPorParte: num(e.target.value) ?? 0 }, true)} />
            </Campo>
          )}
        </div>
      </section>

      <section className="card form">
        <div className="card-linha">
          <h2>{aprendiz ? 'PDFs do curso' : 'Blocos de tópicos'}</h2>
          <button onClick={() => setMostrarLote(!mostrarLote)}>{mostrarLote ? 'Fechar' : 'Colar em lote'}</button>
        </div>
        <p className="muted">
          {aprendiz
            ? 'Liste os PDFs na ordem de estudo. Com o número de páginas, a teoria é dividida sozinha em faixas ("da página X até a página Y").'
            : 'Liste os blocos de tópicos na ordem de estudo. Cada bloco gera uma revisão e um caderno de questões, e a cada 3 blocos um teste.'}
        </p>
        {mostrarLote && (
          <div className="lote">
            <textarea rows={6} value={lote} onChange={(e) => setLote(e.target.value)} autoFocus
              placeholder={aprendiz ? 'Um PDF por linha, com os campos separados por | ou tab (como copiado de uma planilha):\nAula 00 - Princípios | 88 | https://drive.google.com/… | https://www.tecconcursos.com.br/…\nAula 01 - Poderes | 120' : 'Um bloco por linha; o link do caderno é opcional:\nPoder Executivo | https://www.tecconcursos.com.br/…\nPoder Legislativo\nControle de constitucionalidade'} />
            <div className="acoes"><button className="primario" disabled={!lote.trim()} onClick={adicionarLote}>Adicionar {parseLote(lote, d.nivel).length || ''} à lista</button></div>
          </div>
        )}
        {d.fontes.length > 0 && (
          <div className="tabela-wrap">
            <table className="tabela fontes">
              <thead><tr><th>#</th><th>{aprendiz ? 'Nome da aula / PDF' : 'Bloco'}</th>{aprendiz && <th>Páginas</th>}{aprendiz && <th>Link do PDF</th>}<th>Link do caderno</th><th>Assuntos</th><th></th></tr></thead>
              <tbody>
                {d.fontes.map((f, i) => (
                  <tr key={f.id}>
                    <td className="muted">{i + 1}</td>
                    <td><input value={f.nome} onChange={(e) => mudFonte(i, { nome: e.target.value })} aria-label="Nome" placeholder={aprendiz ? 'Aula 00' : 'Nome do bloco'} /></td>
                    {aprendiz && <td><input className="curto" inputMode="numeric" value={f.paginas ?? ''} onChange={(e) => mudFonte(i, { paginas: num(e.target.value) })} aria-label="Páginas" /></td>}
                    {aprendiz && <td><input type="url" value={f.link ?? ''} onChange={(e) => mudFonte(i, { link: e.target.value || undefined })} aria-label="Link do PDF" placeholder="https://" /></td>}
                    <td><input type="url" value={f.caderno ?? ''} onChange={(e) => mudFonte(i, { caderno: e.target.value || undefined })} aria-label="Link do caderno" placeholder="https://" /></td>
                    <td><input value={f.assuntos ?? ''} onChange={(e) => mudFonte(i, { assuntos: e.target.value || undefined })} aria-label="Assuntos" placeholder="opcional" /></td>
                    <td className="nowrap">
                      <button className="icone" disabled={i === 0} onClick={() => moverFonte(i, -1)} aria-label="Subir">↑</button>
                      <button className="icone" disabled={i === d.fontes.length - 1} onClick={() => moverFonte(i, 1)} aria-label="Descer">↓</button>
                      <button className="icone perigo" onClick={() => mud({ fontes: d.fontes.filter((_, j) => j !== i) }, true)} aria-label="Remover">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="acoes">
          <button onClick={() => mud({ fontes: [...d.fontes, { id: uid(), nome: '' }] }, true)}>+ Adicionar {aprendiz ? 'PDF' : 'bloco'}</button>
          <button className="primario" disabled={salvando || d.fontes.every((f) => !f.nome.trim())} onClick={() => salvar(true)}>{salvando ? 'Salvando…' : 'Salvar e gerar caminho'}</button>
        </div>
        {distribuidas > 0 && fontesMudaram && <p className="muted">Ao gerar de novo, o que já entrou em metas ({distribuidas} atividades) e o que você editou à mão é preservado.</p>}
      </section>

      <section className="card form">
        <div className="card-linha">
          <h2>Caminho</h2>
          <button onClick={() => { const a = atividadeManual('Lei Seca', 'Nova atividade', 30); mud({ atividades: [...d.atividades, a] }); setEditando(a) }}>+ Atividade manual</button>
        </div>
        {d.atividades.length === 0 ? (
          <p className="muted">Ainda vazio. Cadastre {aprendiz ? 'os PDFs' : 'os blocos'} acima e clique em "Salvar e gerar caminho".</p>
        ) : (
          <>
            <p className="muted">
              {d.atividades.length} atividades · cerca de {fmtMin(totalMin)} · {porTipo.map(([t, n]) => `${n} ${t}`).join(' · ')}
              {distribuidas > 0 ? ` · ${distribuidas} já distribuídas em metas` : ''}
            </p>
            {fontesMudaram && <p className="aviso">Você mudou {aprendiz ? 'os PDFs' : 'os blocos'} ou o nível. Clique em "Salvar e gerar caminho" para atualizar a lista abaixo.</p>}
            <ol className="caminho-lista editavel">
              {d.atividades.map((a, i) => (
                <li key={a.id} className={a.distribuida ? 'feita' : ''}>
                  <span className="seq muted">{i + 1}</span>
                  <TipoTag tipo={a.tipo} />
                  <span className="cam-titulo">
                    {a.titulo}
                    {a.manual && <span className="tag">manual</span>}
                    {a.editada && !a.manual && <span className="tag">editada</span>}
                    {a.distribuida && <span className="tag sit-cumprida">em meta</span>}
                  </span>
                  <span className="muted cam-info">
                    {a.pagIni && a.pagFim ? `p. ${a.pagIni}-${a.pagFim} · ` : ''}{fmtMin(a.minutos)}
                    {a.tipo === 'Questões' || a.tipo === 'Teste' ? (a.caderno ? ' · caderno ✓' : ' · sem caderno') : ''}
                  </span>
                  <span className="nowrap">
                    <button className="icone" disabled={i === 0} onClick={() => moverAtiv(i, -1)} aria-label="Subir">↑</button>
                    <button className="icone" disabled={i === d.atividades.length - 1} onClick={() => moverAtiv(i, 1)} aria-label="Descer">↓</button>
                    <button className="icone" onClick={() => setEditando(a)} aria-label={`Editar ${a.titulo}`}>✎</button>
                    <button className="icone perigo" onClick={() => mud({ atividades: d.atividades.filter((x) => x.id !== a.id) })} aria-label={`Remover ${a.titulo}`}>✕</button>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {(sujo || msg) && (
        <div className="barra-salvar">
          <span>{sujo ? 'Há alterações não salvas.' : msg}</span>
          {sujo && <button onClick={() => { setD(original); setSujo(false); setFontesMudaram(false) }}>Descartar</button>}
          {sujo && <button className="primario" disabled={salvando} onClick={() => salvar(false)}>Salvar alterações</button>}
        </div>
      )}

      {editando && (
        <AtividadeModal
          a={editando}
          onClose={() => setEditando(null)}
          onSalvar={(a) => { mud({ atividades: d.atividades.map((x) => (x.id === a.id ? a : x)) }); setEditando(null) }}
        />
      )}
    </>
  )
}
