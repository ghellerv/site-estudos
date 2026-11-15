import type { Aprof, Atividade, Disciplina, Item, Meta, Plano, Registro, Tipo } from './types'
import { temQuestoes, uid } from './types'

export const DIA = 24 * 60 * 60 * 1000

/** Quantas atividades cada disciplina ativa recebe numa meta de `total` atividades. */
export function cotas(discs: Disciplina[], total: number): Map<string, number> {
  const ativas = discs.filter((d) => d.ativa && d.atividades.length > 0).sort((a, b) => a.ordem - b.ordem)
  const out = new Map<string, number>()
  let usado = 0
  const autos: Disciplina[] = []
  for (const d of ativas) {
    if (d.cotaTipo === 'fixo') out.set(d.id, Math.max(0, Math.round(d.cotaValor)))
    else if (d.cotaTipo === 'percent') out.set(d.id, Math.max(0, Math.round((total * d.cotaValor) / 100)))
    else autos.push(d)
    usado += out.get(d.id) ?? 0
  }
  const resto = Math.max(0, total - usado)
  autos.forEach((d, i) => out.set(d.id, Math.floor(resto / autos.length) + (i < resto % autos.length ? 1 : 0)))
  return out
}

export const restantes = (d: Disciplina) => d.atividades.filter((a) => !a.distribuida).length

function itemDe(d: Disciplina, a: Atividade): Item {
  return {
    id: uid(),
    origem: 'caminho',
    discId: d.id,
    discNome: d.nome,
    ativId: a.id,
    codigo: `${d.sigla}.${String(d.atividades.indexOf(a) + 1).padStart(3, '0')}`,
    tipo: a.tipo,
    titulo: a.titulo,
    assuntos: a.assuntos,
    pagIni: a.pagIni,
    pagFim: a.pagFim,
    minutosPrev: a.minutos,
    relevancia: d.relevancia,
    link: a.link,
    caderno: a.caderno,
    comando: a.comando,
    status: 'pendente',
    ...registroVazio(),
  }
}

export const registroVazio = (): Registro => ({ minutos: 0, questoes: 0, acertos: 0, erros: {} })

export const abaixoDoLimite = (r: Registro, limite: number) => r.questoes > 0 && (r.acertos / r.questoes) * 100 < limite

export interface MetaGerada {
  meta: Meta
  /** Disciplinas com atividades marcadas como distribuídas (precisam ser salvas). */
  discs: Disciplina[]
}

/**
 * Monta a próxima meta: puxa as próximas atividades do caminho de cada disciplina conforme a cota,
 * intercala as disciplinas e inclui como reforço as questões/testes da meta anterior abaixo do limite.
 */
export function gerarMeta(plano: Plano, discsIn: Disciplina[], anterior: Meta | undefined, agora: number): MetaGerada {
  const discs = discsIn.map((d) => ({ ...d, atividades: d.atividades.map((a) => ({ ...a })) }))
  const ativas = discs.filter((d) => d.ativa && d.atividades.length > 0).sort((a, b) => a.ordem - b.ordem)
  const quota = cotas(discs, plano.atividadesPorMeta)
  const filas = new Map<string, Atividade[]>()
  const alteradas = new Set<string>()

  const puxar = (d: Disciplina): boolean => {
    const fila = filas.get(d.id) ?? []
    if (fila.length >= d.atividades.length) return false
    let prox = d.atividades.find((a) => !a.distribuida)
    if (!prox && d.nivel === 'Expert') {
      // Terminou o caminho: recomeça o ciclo.
      d.atividades.forEach((a) => (a.distribuida = false))
      d.ciclo += 1
      prox = d.atividades.find((a) => !fila.includes(a))
    }
    if (!prox) return false
    prox.distribuida = true
    filas.set(d.id, [...fila, prox])
    alteradas.add(d.id)
    return true
  }

  let falta = 0
  for (const d of ativas) {
    const q = quota.get(d.id) ?? 0
    for (let i = 0; i < q; i++) if (!puxar(d)) falta++
  }
  // O que uma disciplina não conseguiu preencher é redistribuído entre as outras.
  let progrediu = true
  while (falta > 0 && progrediu) {
    progrediu = false
    for (const d of ativas) {
      if (falta > 0 && (quota.get(d.id) ?? 0) > 0 && puxar(d)) {
        falta--
        progrediu = true
      }
    }
  }

  const itens: Item[] = []
  const maior = Math.max(0, ...[...filas.values()].map((f) => f.length))
  for (let i = 0; i < maior; i++) {
    for (const d of ativas) {
      const a = filas.get(d.id)?.[i]
      if (a) itens.push(itemDe(d, a))
    }
  }

  if (anterior) {
    for (const it of anterior.itens) {
      if (it.status === 'cumprida' && temQuestoes(it.tipo) && abaixoDoLimite(it, plano.limiteReforco)) {
        itens.push({ ...it, id: uid(), origem: 'reforco', status: 'pendente', finalizadaEm: undefined, ...registroVazio() })
      }
    }
  }

  const numero = (anterior?.numero ?? 0) + 1
  return {
    meta: { id: String(numero), numero, inicio: agora, prazo: agora + 7 * DIA, adiamentos: 0, itens },
    discs: discs.filter((d) => alteradas.has(d.id)),
  }
}

export type StatusMeta = 'Em dia' | 'Atrasada' | 'Adiada'
export function statusMeta(m: Meta, agora: number): { status: StatusMeta; diasAtraso: number } {
  const fim = m.concluidaEm ?? agora
  const diasAtraso = Math.max(0, Math.ceil((fim - m.prazo) / DIA))
  if (diasAtraso > 0) return { status: 'Atrasada', diasAtraso }
  return { status: m.adiamentos > 0 ? 'Adiada' : 'Em dia', diasAtraso: 0 }
}

export const feitas = (m: Meta) => m.itens.filter((i) => i.status !== 'pendente').length
export const metaCompleta = (m: Meta) => m.itens.every((i) => i.status !== 'pendente')

export interface Lancamento extends Registro {
  discId: string
  discNome: string
  tipo: Tipo
  metaN: number
  origem: 'caminho' | 'reforco' | 'aprofundamento'
}

/** Todos os registros de estudo do plano, para as telas de desempenho. */
export function lancamentos(metas: Meta[], aprofs: Aprof[]): Lancamento[] {
  const out: Lancamento[] = []
  for (const m of metas)
    for (const i of m.itens)
      if (i.status === 'cumprida')
        out.push({ discId: i.discId, discNome: i.discNome, tipo: i.tipo, metaN: m.numero, origem: i.origem, minutos: i.minutos, questoes: i.questoes, acertos: i.acertos, erros: i.erros })
  for (const a of aprofs)
    if (a.status === 'cumprida')
      out.push({ discId: a.discId, discNome: a.discNome, tipo: a.tipo, metaN: a.concluidaNaMeta ?? 0, origem: 'aprofundamento', minutos: a.minutos, questoes: a.questoes, acertos: a.acertos, erros: a.erros })
  return out
}

export const pct = (acertos: number, questoes: number) => (questoes > 0 ? (acertos / questoes) * 100 : null)
export const fmtPct = (v: number | null) => (v === null ? '-' : `${v.toFixed(1).replace('.', ',')}%`)
export function fmtMin(m: number): string {
  const h = Math.floor(m / 60)
  return `${String(h).padStart(2, '0')}h ${String(Math.round(m % 60)).padStart(2, '0')}m`
}
export const fmtData = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

/** Texto padrão do comando de cada tipo de atividade. */
export function comandoPadrao(i: Pick<Item, 'tipo' | 'titulo' | 'assuntos' | 'pagIni' | 'pagFim' | 'minutosPrev' | 'caderno'>): string {
  const t = i.minutosPrev
  const faixa = i.pagIni && i.pagFim ? `, da página ${i.pagIni} até a página ${i.pagFim}` : ''
  switch (i.tipo) {
    case 'Teoria':
      return `Leia o material${faixa}. Vá grifando e anotando os pontos principais: essas anotações serão a base das suas revisões.\n\nTempo sugerido: ${t} minutos.`
    case 'Mapeamento':
      return `Analise as questões comentadas do material, buscando mapear como a banca cobra os assuntos que você acabou de estudar.\n\nLimite de ${t} minutos. Analise apenas a quantidade de questões que couber nesse tempo, mesmo que não chegue ao fim. Esse primeiro contato é exploratório.`
    case 'Questões':
      return `Resolva o caderno de questões sobre: ${i.assuntos || i.titulo}.\n\n${i.caderno ? 'Use o caderno indicado em Material.' : 'Monte um caderno no TEC Concursos filtrando por esse assunto.'} Ao terminar, registre questões resolvidas, acertos e os motivos dos erros.`
    case 'Revisão':
      return `Releia suas anotações e grifos sobre: ${i.assuntos || i.titulo}.\n\nTempo sugerido: ${t} minutos. Foque no que você errou ou teve dúvida nas questões.`
    case 'Teste':
      return `Resolva o caderno misto, sem consultar o material, sobre: ${i.assuntos || i.titulo}.\n\n${i.caderno ? 'Use o caderno indicado em Material.' : 'Monte um caderno no TEC Concursos misturando esses assuntos.'} Ao terminar, registre questões resolvidas, acertos e os motivos dos erros.`
    case 'Lei Seca':
      return `Leia o texto da lei sobre: ${i.assuntos || i.titulo}.\n\nTempo sugerido: ${t} minutos.`
  }
}
