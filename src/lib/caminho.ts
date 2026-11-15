import type { Atividade, Disciplina, Fonte, Nivel, Tipo } from './types'
import { uid } from './types'

const arred5 = (n: number) => Math.max(15, Math.round(n / 5) * 5)
const MIN_POR_PAGINA = 2

function nova(id: string, tipo: Tipo, titulo: string, fontes: Fonte[], extra: Partial<Atividade>): Atividade {
  return {
    id,
    tipo,
    titulo,
    fonteIds: fontes.map((f) => f.id),
    assuntos: fontes.map((f) => f.assuntos || f.nome).join('; '),
    minutos: 30,
    distribuida: false,
    ...extra,
  }
}

const revisao = (f: Fonte) => nova(`r:${f.id}`, 'Revisão', `Revisão: ${f.nome}`, [f], { minutos: 30, link: f.link })
const teste = (fs: Fonte[]) =>
  nova(`x:${fs.map((f) => f.id).join('+')}`, 'Teste', `Teste: ${fs.map((f) => f.nome).join(' + ')}`, fs, { minutos: 40 })

/** Disciplina do zero: teoria por faixas de páginas, mapeamento, questões, revisão espaçada e testes. */
export function gerarAprendiz(fontes: Fonte[], paginasPorParte: number): Atividade[] {
  const out: Atividade[] = []
  const pp = Math.max(1, paginasPorParte || 20)
  let testados = 0
  fontes.forEach((f, i) => {
    const pags = f.paginas || 0
    const partes = pags > 0 ? Math.ceil(pags / pp) : 1
    const tam = pags > 0 ? Math.ceil(pags / partes) : 0
    for (let k = 0; k < partes; k++) {
      const ini = pags > 0 ? k * tam + 1 : undefined
      const fim = pags > 0 ? Math.min(pags, (k + 1) * tam) : undefined
      out.push(
        nova(`t:${f.id}:${k + 1}`, 'Teoria', partes > 1 ? `${f.nome} (parte ${k + 1}/${partes})` : f.nome, [f], {
          pagIni: ini,
          pagFim: fim,
          minutos: ini && fim ? arred5((fim - ini + 1) * MIN_POR_PAGINA) : 40,
          link: f.link,
        }),
      )
    }
    out.push(nova(`m:${f.id}`, 'Mapeamento', `Mapeamento: ${f.nome}`, [f], { minutos: 60, link: f.link }))
    out.push(nova(`q:${f.id}`, 'Questões', `Questões: ${f.nome}`, [f], { minutos: 40, caderno: f.caderno }))
    if (i >= 2) out.push(revisao(fontes[i - 2]))
    if (i % 2 === 1 && i >= 3) {
      out.push(teste([fontes[i - 3], fontes[i - 2]]))
      testados = i - 1
    }
  })
  const n = fontes.length
  if (n >= 2) out.push(revisao(fontes[n - 2]))
  if (n >= 1) out.push(revisao(fontes[n - 1]))
  for (let i = testados; i < n; i += 2) out.push(teste(fontes.slice(i, i + 2)))
  return out
}

/** Disciplina já estudada: por bloco de tópicos, revisão e questões; teste a cada 3 blocos. */
export function gerarExpert(fontes: Fonte[]): Atividade[] {
  const out: Atividade[] = []
  let grupo: Fonte[] = []
  fontes.forEach((f, i) => {
    out.push(revisao(f))
    out.push(nova(`q:${f.id}`, 'Questões', `Questões: ${f.nome}`, [f], { minutos: 40, caderno: f.caderno }))
    grupo.push(f)
    if (grupo.length === 3 || i === fontes.length - 1) {
      out.push(teste(grupo))
      grupo = []
    }
  })
  return out
}

/**
 * Gera o caminho de novo a partir das fontes, preservando o que já foi distribuído,
 * as atividades editadas à mão e as atividades criadas manualmente.
 */
export function regenerar(d: Pick<Disciplina, 'nivel' | 'fontes' | 'paginasPorParte' | 'atividades'>): Atividade[] {
  const base = d.nivel === 'Aprendiz' ? gerarAprendiz(d.fontes, d.paginasPorParte) : gerarExpert(d.fontes)
  const antigas = new Map(d.atividades.map((a) => [a.id, a]))
  const geradas = base.map((a) => {
    const old = antigas.get(a.id)
    if (!old) return a
    return old.editada ? old : { ...a, distribuida: old.distribuida }
  })
  const ids = new Set(geradas.map((a) => a.id))
  const porAncora = new Map<string, Atividade[]>()
  let ancora = ''
  for (const a of d.atividades) {
    if (a.manual) porAncora.set(ancora, [...(porAncora.get(ancora) ?? []), a])
    else if (ids.has(a.id)) ancora = a.id
  }
  const out: Atividade[] = [...(porAncora.get('') ?? [])]
  for (const a of geradas) out.push(a, ...(porAncora.get(a.id) ?? []))
  return out
}

export function atividadeManual(tipo: Tipo, titulo: string, minutos: number): Atividade {
  return { id: `manual:${uid()}`, tipo, titulo, fonteIds: [], minutos, distribuida: false, manual: true, editada: true }
}

const ehUrl = (s: string) => /^https?:\/\//i.test(s)

/**
 * Lê fontes coladas em lote, uma por linha. Campos separados por tab, "|" ou ";".
 * Aceita em qualquer ordem: nome, número de páginas, link do PDF e link do caderno (tecconcursos).
 * O texto depois do nome que não for número nem link vira "assuntos".
 */
export function parseLote(texto: string, nivel: Nivel): Fonte[] {
  const out: Fonte[] = []
  for (const linha of texto.split(/\r?\n/)) {
    const campos = linha.split(/\t|\||;/).map((c) => c.trim()).filter(Boolean)
    if (!campos.length) continue
    const f: Fonte = { id: uid(), nome: '' }
    for (const c of campos) {
      if (ehUrl(c)) {
        if (/tecconcursos|qconcursos|caderno/i.test(c) || nivel === 'Expert') f.caderno ??= c
        else if (!f.link) f.link = c
        else f.caderno ??= c
      } else if (/^\d+$/.test(c) && f.nome && f.paginas === undefined && nivel === 'Aprendiz') f.paginas = Number(c)
      else if (!f.nome) f.nome = c
      else f.assuntos = f.assuntos ? `${f.assuntos}; ${c}` : c
    }
    if (f.nome) out.push(f)
  }
  return out
}

export function siglaDe(nome: string): string {
  const palavras = nome.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((p) => p.length > 2 || /^[A-Z]+$/.test(p))
  if (palavras.length === 0) return 'DISC'
  if (palavras.length === 1) return palavras[0].slice(0, 4).toUpperCase()
  return palavras.map((p) => p[0]).join('').slice(0, 5).toUpperCase()
}
