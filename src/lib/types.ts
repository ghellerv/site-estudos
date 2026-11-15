export type Tipo = 'Teoria' | 'Mapeamento' | 'Questões' | 'Revisão' | 'Teste' | 'Lei Seca'
export const TIPOS: Tipo[] = ['Teoria', 'Mapeamento', 'Questões', 'Revisão', 'Teste', 'Lei Seca']
export type Nivel = 'Aprendiz' | 'Expert'
export type CotaTipo = 'auto' | 'percent' | 'fixo'

/** Um PDF (Aprendiz) ou um bloco de tópicos (Expert). */
export interface Fonte {
  id: string
  nome: string
  paginas?: number
  link?: string
  caderno?: string
  assuntos?: string
}

export interface Atividade {
  id: string
  tipo: Tipo
  titulo: string
  fonteIds: string[]
  assuntos?: string
  pagIni?: number
  pagFim?: number
  minutos: number
  link?: string
  caderno?: string
  comando?: string
  distribuida: boolean
  manual?: boolean
  editada?: boolean
}

export interface Disciplina {
  id: string
  nome: string
  sigla: string
  nivel: Nivel
  relevancia: number
  cotaTipo: CotaTipo
  cotaValor: number
  paginasPorParte: number
  ativa: boolean
  ordem: number
  ciclo: number
  fontes: Fonte[]
  atividades: Atividade[]
}

export interface Plano {
  id: string
  nome: string
  ownerUid: string
  ownerEmail: string
  studentEmail: string
  atividadesPorMeta: number
  limiteReforco: number
  criadoEm: number
}

export const MOTIVOS = [
  'Desconhecimento',
  'Esquecimento',
  'Confusão conceitual',
  'Erro de interpretação',
  'Falta de atenção',
  'Falta de tempo',
] as const

export interface Registro {
  minutos: number
  questoes: number
  acertos: number
  erros: Record<string, number>
  revisouAntes?: boolean
  conferiu?: 'cada' | 'final'
}

export type Situacao = 'pendente' | 'cumprida' | 'ignorada'

export interface Item extends Registro {
  id: string
  origem: 'caminho' | 'reforco'
  discId: string
  discNome: string
  ativId: string
  codigo: string
  tipo: Tipo
  titulo: string
  assuntos?: string
  pagIni?: number
  pagFim?: number
  minutosPrev: number
  relevancia: number
  link?: string
  caderno?: string
  comando?: string
  status: Situacao
  finalizadaEm?: number
}

export interface Meta {
  id: string
  numero: number
  inicio: number
  prazo: number
  adiamentos: number
  concluidaEm?: number
  itens: Item[]
}

export interface Aprof extends Registro {
  id: string
  discId: string
  discNome: string
  assunto: string
  tipo: Tipo
  orientacao?: string
  link?: string
  /** null = backlog; número = meta em que deve ser feito */
  metaN: number | null
  status: Situacao
  criadoEm: number
  finalizadaEm?: number
  concluidaNaMeta?: number
}

export interface Usuario {
  uid: string
  email: string
  nome: string
  foto?: string
}

export const uid = () => Math.random().toString(36).slice(2, 10)
export const temQuestoes = (t: Tipo) => t === 'Questões' || t === 'Teste'
