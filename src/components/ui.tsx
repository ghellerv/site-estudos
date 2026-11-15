import { useEffect, type ReactNode } from 'react'
import type { Tipo } from '../lib/types'
import { fmtPct } from '../lib/meta'

export function Modal({ titulo, sub, onClose, children, rodape, lateral }: { titulo: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; rodape?: ReactNode; lateral?: boolean }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [onClose])
  return (
    <div className={`modal-fundo${lateral ? ' lateral' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <header className="modal-topo">
          <div>
            <h2>{titulo}</h2>
            {sub && <p className="muted">{sub}</p>}
          </div>
          <button className="icone" onClick={onClose} aria-label="Fechar">✕</button>
        </header>
        <div className="modal-corpo">{children}</div>
        {rodape && <footer className="modal-rodape">{rodape}</footer>}
      </div>
    </div>
  )
}

const CLASSE_TIPO: Record<Tipo, string> = { Teoria: 'teoria', Mapeamento: 'mapeamento', 'Questões': 'questoes', 'Revisão': 'revisao', Teste: 'teste', 'Lei Seca': 'lei' }
export const TipoTag = ({ tipo }: { tipo: Tipo }) => <span className={`tag tipo-${CLASSE_TIPO[tipo]}`}>{tipo}</span>

export const Estrelas = ({ n }: { n: number }) => (
  <span className="estrelas" aria-label={`Relevância ${n} de 5`}>
    {'★'.repeat(n)}
    <span className="apagada">{'★'.repeat(Math.max(0, 5 - n))}</span>
  </span>
)

export const Barra = ({ valor }: { valor: number }) => (
  <div className="barra" role="progressbar" aria-valuenow={Math.round(valor)} aria-valuemin={0} aria-valuemax={100}>
    <div style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
  </div>
)

export function PctTag({ valor, limite = 80 }: { valor: number | null; limite?: number }) {
  if (valor === null) return <span className="muted">-</span>
  return <span className={`tag ${valor >= limite ? 'ok' : valor >= limite - 20 ? 'alerta' : 'ruim'}`}>{fmtPct(valor)}</span>
}

export const Campo = ({ rotulo, children, dica }: { rotulo: string; children: ReactNode; dica?: string }) => (
  <label className="campo">
    <span>{rotulo}</span>
    {children}
    {dica && <small className="muted">{dica}</small>}
  </label>
)

export const Vazio = ({ titulo, children }: { titulo: string; children?: ReactNode }) => (
  <div className="vazio">
    <h2>{titulo}</h2>
    {children}
  </div>
)
