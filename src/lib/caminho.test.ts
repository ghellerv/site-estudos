import { describe, expect, it } from 'vitest'
import { gerarAprendiz, gerarExpert, parseLote, regenerar, siglaDe } from './caminho'
import { cotas, gerarMeta } from './meta'
import type { Disciplina, Fonte, Plano } from './types'

const pdfs = (n: number, pags = 45): Fonte[] => Array.from({ length: n }, (_, i) => ({ id: `f${i + 1}`, nome: `Aula ${i + 1}`, paginas: pags }))
const disc = (p: Partial<Disciplina>): Disciplina => ({
  id: 'd', nome: 'D', sigla: 'D', nivel: 'Aprendiz', relevancia: 3, cotaTipo: 'auto', cotaValor: 0, paginasPorParte: 20,
  ativa: true, ordem: 0, ciclo: 1, fontes: [], atividades: [], ...p,
})
const plano: Plano = { id: 'p', nome: 'P', ownerUid: 'u', ownerEmail: '', studentEmail: '', atividadesPorMeta: 10, limiteReforco: 80, criadoEm: 0 }

describe('caminho aprendiz', () => {
  it('divide a teoria em faixas de páginas equilibradas', () => {
    const t = gerarAprendiz(pdfs(1, 45), 20).filter((a) => a.tipo === 'Teoria')
    expect(t.map((a) => [a.pagIni, a.pagFim])).toEqual([[1, 15], [16, 30], [31, 45]])
  })
  it('todo PDF tem mapeamento, questões, revisão e entra em um teste', () => {
    const f = pdfs(7)
    const c = gerarAprendiz(f, 20)
    for (const x of f) {
      expect(c.filter((a) => a.id === `m:${x.id}`)).toHaveLength(1)
      expect(c.filter((a) => a.id === `q:${x.id}`)).toHaveLength(1)
      expect(c.filter((a) => a.id === `r:${x.id}`)).toHaveLength(1)
      expect(c.filter((a) => a.tipo === 'Teste' && a.fonteIds.includes(x.id))).toHaveLength(1)
    }
    expect(new Set(c.map((a) => a.id)).size).toBe(c.length)
  })
  it('revisão vem depois das questões do mesmo PDF', () => {
    const c = gerarAprendiz(pdfs(5), 20).map((a) => a.id)
    expect(c.indexOf('r:f1')).toBeGreaterThan(c.indexOf('q:f3'))
  })
})

describe('caminho expert', () => {
  it('revisão e questões por bloco, teste a cada 3', () => {
    const c = gerarExpert(pdfs(7))
    expect(c.filter((a) => a.tipo === 'Teste').map((a) => a.fonteIds.length)).toEqual([3, 3, 1])
    expect(c.filter((a) => a.tipo === 'Teoria')).toHaveLength(0)
  })
})

describe('regenerar', () => {
  it('preserva distribuídas, editadas e manuais', () => {
    const d = disc({ fontes: pdfs(2) })
    d.atividades = regenerar(d)
    d.atividades[0].distribuida = true
    d.atividades[1] = { ...d.atividades[1], titulo: 'Editada', editada: true }
    d.atividades.splice(2, 0, { id: 'manual:1', tipo: 'Lei Seca', titulo: 'Lei', fonteIds: [], minutos: 30, distribuida: false, manual: true })
    d.fontes = pdfs(3)
    const r = regenerar(d)
    expect(r[0].distribuida).toBe(true)
    expect(r[1].titulo).toBe('Editada')
    expect(r[2].id).toBe('manual:1')
    expect(r.some((a) => a.id === 'm:f3')).toBe(true)
  })
})

describe('parseLote', () => {
  it('lê nome, páginas e links em qualquer ordem', () => {
    const [a, b] = parseLote('Aula 00 | 88 | https://drive.google.com/x | https://www.tecconcursos.com.br/c/1\nAula 01\t120', 'Aprendiz')
    expect(a).toMatchObject({ nome: 'Aula 00', paginas: 88, link: 'https://drive.google.com/x', caderno: 'https://www.tecconcursos.com.br/c/1' })
    expect(b).toMatchObject({ nome: 'Aula 01', paginas: 120 })
  })
  it('expert: link é o caderno', () => {
    expect(parseLote('Poder Executivo; https://x.com/1', 'Expert')[0]).toMatchObject({ nome: 'Poder Executivo', caderno: 'https://x.com/1' })
  })
  it('sigla', () => {
    expect(siglaDe('Direito Constitucional')).toBe('DC')
    expect(siglaDe('Português')).toBe('PORT')
  })
})

describe('meta', () => {
  const mk = (id: string, p: Partial<Disciplina> = {}) => {
    const d = disc({ id, nome: id, sigla: id, fontes: pdfs(6), ...p })
    d.atividades = regenerar(d)
    return d
  }
  it('cotas: fixo, percentual e automático somam o total', () => {
    const q = cotas([mk('a', { cotaTipo: 'fixo', cotaValor: 2 }), mk('b', { cotaTipo: 'percent', cotaValor: 30, ordem: 1 }), mk('c', { ordem: 2 }), mk('e', { ordem: 3 })], 10)
    expect([...q.values()]).toEqual([2, 3, 3, 2])
  })
  it('gera a meta intercalada e marca distribuídas', () => {
    const { meta, discs } = gerarMeta(plano, [mk('a'), mk('b', { ordem: 1 })], undefined, 0)
    expect(meta.itens).toHaveLength(10)
    expect(meta.itens.slice(0, 4).map((i) => i.discId)).toEqual(['a', 'b', 'a', 'b'])
    expect(discs[0].atividades.filter((a) => a.distribuida)).toHaveLength(5)
  })
  it('expert recomeça o ciclo e aprendiz esgotado cede a vaga', () => {
    const ex = mk('x', { nivel: 'Expert', fontes: pdfs(1) }) // 3 atividades
    const ap = mk('y', { fontes: pdfs(1, 10), ordem: 1 }) // 5 atividades
    const g1 = gerarMeta({ ...plano, atividadesPorMeta: 4 }, [ex, ap], undefined, 0)
    expect(g1.meta.itens).toHaveLength(4)
    const [ex2, ap2] = ['x', 'y'].map((id) => g1.discs.find((d) => d.id === id)!)
    const g2 = gerarMeta({ ...plano, atividadesPorMeta: 6 }, [ex2, ap2], g1.meta, 0)
    expect(g2.meta.itens).toHaveLength(6)
    expect(g2.discs.find((d) => d.id === 'x')!.ciclo).toBe(2)
    expect(g2.meta.itens.filter((i) => i.discId === 'y')).toHaveLength(3)
  })
  it('reforço: repete questões abaixo do limite', () => {
    const g1 = gerarMeta(plano, [mk('a', { nivel: 'Expert' })], undefined, 0)
    const q = g1.meta.itens.find((i) => i.tipo === 'Questões')!
    Object.assign(q, { status: 'cumprida', questoes: 10, acertos: 7 })
    const g2 = gerarMeta(plano, g1.discs, g1.meta, 0)
    const r = g2.meta.itens.filter((i) => i.origem === 'reforco')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ ativId: q.ativId, status: 'pendente', questoes: 0 })
  })
})
