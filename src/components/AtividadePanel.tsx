import { useState } from 'react'
import { comandoPadrao, fmtMin, fmtPct, pct } from '../lib/meta'
import { usePlano } from '../lib/plan'
import { temQuestoes, type Item, type Meta } from '../lib/types'
import { RegistroModal } from './Registro'
import { Modal, TipoTag } from './ui'

const ROTULO = { pendente: 'Pendente', cumprida: 'Cumprida', ignorada: 'Ignorada' }

/** Atividade aberta: assuntos, material, comando e as ações de finalizar ou ignorar. */
export function AtividadePanel({ meta, item, onClose, onNav }: { meta: Meta; item: Item; onClose: () => void; onNav: (d: number) => void }) {
  const { salvarItem } = usePlano()
  const [registrando, setRegistrando] = useState(false)
  const salvar = (patch: Partial<Item>) => salvarItem(meta.numero, { ...item, ...patch })

  return (
    <>
      <Modal
        lateral
        titulo={item.discNome}
        sub={item.titulo}
        onClose={onClose}
        rodape={
          <>
            <span className="rodape-info">
              <TipoTag tipo={item.tipo} /> <span className="muted">#{meta.itens.indexOf(item) + 1} · {item.codigo}</span>{' '}
              <span className={`tag sit-${item.status}`}>{ROTULO[item.status]}</span>
            </span>
            <button onClick={() => onNav(-1)} aria-label="Atividade anterior">‹</button>
            <button onClick={() => onNav(1)} aria-label="Próxima atividade">›</button>
            {item.status === 'pendente' ? (
              <>
                <button onClick={() => salvar({ status: 'ignorada', finalizadaEm: Date.now() })}>Ignorar</button>
                <button className="primario" onClick={() => setRegistrando(true)}>Finalizar</button>
              </>
            ) : (
              <>
                <button onClick={() => salvar({ status: 'pendente', finalizadaEm: undefined })}>Reabrir</button>
                {item.status === 'cumprida' && <button className="primario" onClick={() => setRegistrando(true)}>Editar registro</button>}
              </>
            )}
          </>
        }
      >
        {item.origem === 'reforco' && <p className="aviso">Reforço: você ficou abaixo do limite nesta atividade na meta anterior, por isso ela voltou.</p>}
        {item.status === 'cumprida' && (
          <p className="resultado">
            Registrado: <b>{fmtMin(item.minutos)}</b>
            {temQuestoes(item.tipo) && <> · {item.acertos} de {item.questoes} questões · <b>{fmtPct(pct(item.acertos, item.questoes))}</b></>}
          </p>
        )}

        <h3>Comando</h3>
        <div className="comando">{item.comando || comandoPadrao(item)}</div>

        <h3>Material</h3>
        <ul className="material">
          {item.link && (
            <li>
              <a href={item.link} target="_blank" rel="noreferrer">Abrir o PDF</a>
              {item.tipo === 'Teoria' && item.pagIni && item.pagFim ? <> · da página <b>{item.pagIni}</b> até a página <b>{item.pagFim}</b></> : null}
            </li>
          )}
          {!item.link && item.tipo === 'Teoria' && item.pagIni && item.pagFim && <li>Da página <b>{item.pagIni}</b> até a página <b>{item.pagFim}</b></li>}
          {item.caderno && <li><a href={item.caderno} target="_blank" rel="noreferrer">Abrir o caderno de questões</a></li>}
          {!item.link && !item.caderno && !(item.pagIni && item.pagFim) && <li className="muted">Nenhum link cadastrado para esta atividade.</li>}
          <li className="muted">Tempo previsto: {fmtMin(item.minutosPrev)}</li>
        </ul>

        {item.assuntos && (
          <>
            <h3>Assuntos abordados</h3>
            <ul className="material">{item.assuntos.split(';').map((a, i) => <li key={i}>{a.trim()}</li>)}</ul>
          </>
        )}
      </Modal>
      {registrando && (
        <RegistroModal
          tipo={item.tipo}
          inicial={item}
          onClose={() => setRegistrando(false)}
          onSalvar={async (r) => {
            await salvar({ ...r, status: 'cumprida', finalizadaEm: item.finalizadaEm ?? Date.now() })
            setRegistrando(false)
          }}
        />
      )}
    </>
  )
}
