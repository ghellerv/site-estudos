import { collection, deleteDoc, doc, getDocs, query, runTransaction, setDoc, where } from 'firebase/firestore'
import { db } from './firebase'
import type { Aprof, Disciplina, Meta, Plano, Usuario } from './types'

export interface DadosPlano {
  discs: Disciplina[]
  metas: Meta[]
  aprofs: Aprof[]
}

type Sub = 'disciplines' | 'metas' | 'aprofundamentos'

/** Acesso aos dados. Firestore em produção; localStorage no modo de demonstração (?demo=1). */
export interface Store {
  listarPlanos(u: Usuario): Promise<Plano[]>
  salvarPlano(p: Plano): Promise<void>
  excluirPlano(id: string): Promise<void>
  carregar(planoId: string): Promise<DadosPlano>
  salvar(planoId: string, sub: Sub, d: { id: string }): Promise<void>
  excluir(planoId: string, sub: Sub, id: string): Promise<void>
  /**
   * Lê a versão mais recente do documento no servidor, aplica `fn` e grava, tudo numa transação.
   * Evita que uma aba ou pessoa com dados antigos apague o que outra acabou de salvar.
   */
  atualizar<T extends { id: string }>(planoId: string, sub: Sub, id: string, fn: (atual: T | undefined) => T): Promise<T>
}

const SUBS: Sub[] = ['disciplines', 'metas', 'aprofundamentos']

const fire: Store = {
  async listarPlanos(u) {
    const c = collection(db, 'plans')
    const [meus, dela] = await Promise.allSettled([
      getDocs(query(c, where('ownerUid', '==', u.uid))),
      getDocs(query(c, where('studentEmail', '==', u.email.toLowerCase()))),
    ])
    // Uma consulta que falha não pode esconder os planos da outra.
    if (meus.status === 'rejected' && dela.status === 'rejected') throw meus.reason
    const m = new Map<string, Plano>()
    for (const r of [meus, dela]) {
      if (r.status === 'fulfilled') for (const s of r.value.docs) m.set(s.id, s.data() as Plano)
      else console.error('Falha ao listar planos', r.reason)
    }
    return [...m.values()]
  },
  async salvarPlano(p) {
    await setDoc(doc(db, 'plans', p.id), p)
  },
  async excluirPlano(id) {
    for (const sub of SUBS) {
      const s = await getDocs(collection(db, 'plans', id, sub))
      await Promise.all(s.docs.map((d) => deleteDoc(d.ref)))
    }
    await deleteDoc(doc(db, 'plans', id))
  },
  async carregar(id) {
    const [d, m, a] = await Promise.all(SUBS.map((s) => getDocs(collection(db, 'plans', id, s))))
    return {
      discs: d.docs.map((x) => x.data() as Disciplina),
      metas: m.docs.map((x) => x.data() as Meta),
      aprofs: a.docs.map((x) => x.data() as Aprof),
    }
  },
  async salvar(planoId, sub, d) {
    await setDoc(doc(db, 'plans', planoId, sub, d.id), d)
  },
  async excluir(planoId, sub, id) {
    await deleteDoc(doc(db, 'plans', planoId, sub, id))
  },
  async atualizar<T extends { id: string }>(planoId: string, sub: Sub, id: string, fn: (atual: T | undefined) => T) {
    const ref = doc(db, 'plans', planoId, sub, id)
    return runTransaction(db, async (tx) => {
      const s = await tx.get(ref)
      const novo = fn(s.exists() ? (s.data() as T) : undefined)
      tx.set(ref, novo)
      return novo
    })
  },
}

interface Banco {
  plans: Record<string, Plano>
  sub: Record<string, Record<Sub, Record<string, unknown>>>
}
const CHAVE = 'site-estudos-demo'
const ler = (): Banco => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || '') as Banco
  } catch {
    return { plans: {}, sub: {} }
  }
}
const gravar = (b: Banco) => localStorage.setItem(CHAVE, JSON.stringify(b))
const subDe = (b: Banco, id: string) => (b.sub[id] ??= { disciplines: {}, metas: {}, aprofundamentos: {} })

const local: Store = {
  async listarPlanos(u) {
    return Object.values(ler().plans).filter((p) => p.ownerUid === u.uid || p.studentEmail === u.email)
  },
  async salvarPlano(p) {
    const b = ler()
    b.plans[p.id] = p
    gravar(b)
  },
  async excluirPlano(id) {
    const b = ler()
    delete b.plans[id]
    delete b.sub[id]
    gravar(b)
  },
  async carregar(id) {
    const s = subDe(ler(), id)
    return {
      discs: Object.values(s.disciplines) as Disciplina[],
      metas: Object.values(s.metas) as Meta[],
      aprofs: Object.values(s.aprofundamentos) as Aprof[],
    }
  },
  async salvar(planoId, sub, d) {
    const b = ler()
    subDe(b, planoId)[sub][d.id] = JSON.parse(JSON.stringify(d))
    gravar(b)
  },
  async excluir(planoId, sub, id) {
    const b = ler()
    delete subDe(b, planoId)[sub][id]
    gravar(b)
  },
  async atualizar<T extends { id: string }>(planoId: string, sub: Sub, id: string, fn: (atual: T | undefined) => T) {
    const b = ler()
    const novo = JSON.parse(JSON.stringify(fn(subDe(b, planoId)[sub][id] as T | undefined))) as T
    subDe(b, planoId)[sub][id] = novo
    gravar(b)
    return novo
  },
}

export const MODO_DEMO = new URLSearchParams(window.location.search).has('demo')
export const store: Store = MODO_DEMO ? local : fire
