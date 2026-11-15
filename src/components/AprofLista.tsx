import { useState } from 'react'
import { fmtMin, fmtPct, pct } from '../lib/meta'
import { usePlano } from '../lib/plan'
import { temQuestoes, type Aprof } from '../lib/types'
import { RegistroModal } from './Registro'
import { TipoTag } from './ui'

/** Lista de aprofundamentos com as ações: fazer agora, mover entre backlog e próxima meta, excluir. */
export function AprofLista({ itens, vazio }: { itens: Aprof[]; vazio: string }) {
  const { salvarAprof, excluirAprof, metaAtual } = usePlano()
  const [reg, setReg] = useState<Aprof | null>(null)
  const proxima = (metaAtual?.numero ?? 0) + 1
  if (!itens.length) return <p className="muted pad">{vazio}</p>
  return (
    <>
      <ul className="aprofs">
        {itens.map((a) => (
          <li key={a.id}>
            <div className="aprof-info">
              <strong>{a.discNome}</strong> <TipoTag tipo={a.tipo} />{' '}
              {a.status === 'cumprida' ? (
                <span className="tag sit-cumprida">Concluído{a.concluidaNaMeta ? ` na ${a.concluidaNaMeta}ª meta` : ''}</span>
              ) : a.metaN === null ? (
                <span className="tag">Backlog</span>
              ) : (
                <span className="tag sit-pendente">{a.metaN}ª meta</span>
              )}
              <div>{a.assunto}</div>
              {a.orientacao && <div className="muted">{a.orientacao}</div>}
              {a.link && <a href={a.link} target="_blank" rel="noreferrer">Abrir link</a>}
              {a.status === 'cumprida' && (
                <div className="muted">
                  {fmtMin(a.minutos)}
                  {temQuestoes(a.tipo) && <> · {a.acertos}/{a.questoes} · {fmtPct(pct(a.acertos, a.questoes))}</>}
                </div>
              )}
            </div>
            <div className="aprof-acoes">
              {a.status === 'pendente' && <button className="primario" onClick={() => setReg(a)}>Finalizar</button>}
              {a.status === 'cumprida' && <button onClick={() => setReg(a)}>Editar registro</button>}
              {a.status === 'pendente' && a.metaN === null && <button onClick={() => salvarAprof({ ...a, metaN: proxima })}>Enviar para a próxima meta</button>}
              {a.status === 'pendente' && a.metaN !== null && <button onClick={() => salvarAprof({ ...a, metaN: null })}>Voltar ao backlog</button>}
              <button className="perigo" onClick={() => window.confirm('Excluir este aprofundamento?') && excluirAprof(a.id)}>Excluir</button>
            </div>
          </li>
        ))}
      </ul>
      {reg && (
        <RegistroModal
          tipo={reg.tipo}
          inicial={reg}
          onClose={() => setReg(null)}
          onSalvar={async (r) => {
            await salvarAprof({ ...reg, ...r, status: 'cumprida', finalizadaEm: reg.finalizadaEm ?? Date.now(), concluidaNaMeta: reg.concluidaNaMeta ?? metaAtual?.numero ?? 0 })
            setReg(null)
          }}
        />
      )}
    </>
  )
}
