import { useState } from 'react'
import { MOTIVOS, temQuestoes, type Registro, type Tipo } from '../lib/types'
import { Campo, Modal } from './ui'

/** Modal de "Registrar desempenho": só tempo, ou tempo + questões + motivos de erro. */
export function RegistroModal({ tipo, inicial, onSalvar, onClose }: { tipo: Tipo; inicial: Registro; onSalvar: (r: Registro) => Promise<void>; onClose: () => void }) {
  const comQ = temQuestoes(tipo)
  const [h, setH] = useState(String(Math.floor(inicial.minutos / 60)))
  const [m, setM] = useState(String(inicial.minutos % 60))
  const [q, setQ] = useState(inicial.questoes ? String(inicial.questoes) : '')
  const [a, setA] = useState(inicial.questoes ? String(inicial.acertos) : '')
  const [erros, setErros] = useState<Record<string, number>>(inicial.erros ?? {})
  const [revisou, setRevisou] = useState(inicial.revisouAntes)
  const [conferiu, setConferiu] = useState(inicial.conferiu)
  const [salvando, setSalvando] = useState(false)

  const minutos = (Number(h) || 0) * 60 + (Number(m) || 0)
  const questoes = Number(q) || 0
  const acertos = Number(a) || 0
  const totalErros = Math.max(0, questoes - acertos)
  const atribuidos = Object.values(erros).reduce((s, v) => s + v, 0)
  const invalido = minutos <= 0 || (comQ && (questoes <= 0 || acertos > questoes || atribuidos > totalErros))

  const mudar = (motivo: string, d: number) =>
    setErros((e) => {
      const v = Math.max(0, (e[motivo] ?? 0) + d)
      if (d > 0 && atribuidos >= totalErros) return e
      return { ...e, [motivo]: v }
    })

  async function salvar() {
    setSalvando(true)
    try {
      await onSalvar({ minutos, questoes: comQ ? questoes : 0, acertos: comQ ? acertos : 0, erros: comQ ? erros : {}, revisouAntes: comQ ? revisou : undefined, conferiu: comQ ? conferiu : undefined })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      titulo="Registrar desempenho"
      onClose={onClose}
      rodape={
        <>
          <button onClick={onClose}>Cancelar</button>
          <button className="primario" disabled={invalido || salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </>
      }
    >
      <div className={comQ ? 'registro duas' : 'registro'}>
        <div className="form">
          {comQ && (
            <div className="linha">
              <Campo rotulo="Questões resolvidas"><input inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))} autoFocus /></Campo>
              <Campo rotulo="Total de acertos"><input inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ''))} /></Campo>
            </div>
          )}
          <div className="linha">
            <Campo rotulo="Horas"><input inputMode="numeric" value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, ''))} autoFocus={!comQ} /></Campo>
            <Campo rotulo="Minutos"><input inputMode="numeric" value={m} onChange={(e) => setM(e.target.value.replace(/\D/g, ''))} /></Campo>
          </div>
          {comQ && acertos > questoes && <p className="erro">Os acertos não podem passar do número de questões.</p>}
          {comQ && (
            <>
              <fieldset>
                <legend>Revisou antes de resolver?</legend>
                <label><input type="radio" checked={revisou === true} onChange={() => setRevisou(true)} /> Sim</label>
                <label><input type="radio" checked={revisou === false} onChange={() => setRevisou(false)} /> Não</label>
              </fieldset>
              <fieldset>
                <legend>Quando conferiu os gabaritos?</legend>
                <label><input type="radio" checked={conferiu === 'cada'} onChange={() => setConferiu('cada')} /> A cada questão</label>
                <label><input type="radio" checked={conferiu === 'final'} onChange={() => setConferiu('final')} /> Só ao final</label>
              </fieldset>
            </>
          )}
        </div>
        {comQ && (
          <div className="motivos">
            <strong>Detalhe os erros <span className="muted">(opcional)</span></strong>
            <p className="muted">Atribua um motivo a cada erro para enxergar o seu padrão de erros.</p>
            {MOTIVOS.map((mot) => (
              <div className="motivo" key={mot}>
                <span>{mot}</span>
                <button className="icone" onClick={() => mudar(mot, -1)} aria-label={`Menos ${mot}`}>−</button>
                <b>{erros[mot] ?? 0}</b>
                <button className="icone" onClick={() => mudar(mot, 1)} aria-label={`Mais ${mot}`} disabled={atribuidos >= totalErros}>+</button>
              </div>
            ))}
            <div className="motivo"><span>Não especificado</span><b>{Math.max(0, totalErros - atribuidos)}</b></div>
          </div>
        )}
      </div>
    </Modal>
  )
}
