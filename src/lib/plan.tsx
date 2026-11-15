import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { DIA, gerarMeta, metaCompleta } from './meta'
import { store } from './store'
import type { Aprof, Disciplina, Item, Meta, Plano } from './types'
import { uid } from './types'

interface PlanState {
  planos: Plano[]
  plano: Plano | null
  souDono: boolean
  discs: Disciplina[]
  metas: Meta[]
  metaAtual: Meta | undefined
  aprofs: Aprof[]
  carregando: boolean
  erro: string
  selecionar: (id: string) => void
  recarregar: () => Promise<void>
  criarPlano: (nome: string) => Promise<Plano>
  salvarPlano: (p: Plano) => Promise<void>
  excluirPlano: (id: string) => Promise<void>
  duplicarPlano: (id: string) => Promise<void>
  salvarDisc: (d: Disciplina) => Promise<void>
  excluirDisc: (id: string) => Promise<void>
  salvarItem: (metaN: number, item: Item) => Promise<void>
  adiarMeta: () => Promise<void>
  iniciarProximaMeta: () => Promise<void>
  salvarAprof: (a: Aprof) => Promise<void>
  excluirAprof: (id: string) => Promise<void>
}

const Ctx = createContext<PlanState | null>(null)
const CHAVE_ATIVO = 'site-estudos-plano-ativo'

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [planos, setPlanos] = useState<Plano[]>([])
  const [ativoId, setAtivoId] = useState<string>(() => localStorage.getItem(CHAVE_ATIVO) ?? '')
  const [discs, setDiscs] = useState<Disciplina[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [aprofs, setAprofs] = useState<Aprof[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const plano = useMemo(() => planos.find((p) => p.id === ativoId) ?? planos[0] ?? null, [planos, ativoId])
  const planoId = plano?.id ?? ''

  const falha = (e: unknown) => {
    console.error(e)
    setErro('Não foi possível falar com o servidor. Verifique a conexão e tente de novo.')
    throw e
  }

  const carregarDados = useCallback(async (id: string) => {
    if (!id) {
      setDiscs([])
      setMetas([])
      setAprofs([])
      return
    }
    const d = await store.carregar(id)
    setDiscs(d.discs.sort((a, b) => a.ordem - b.ordem))
    setMetas(d.metas.sort((a, b) => a.numero - b.numero))
    setAprofs(d.aprofs.sort((a, b) => b.criadoEm - a.criadoEm))
  }, [])

  const recarregar = useCallback(async () => {
    if (!user) return
    setCarregando(true)
    setErro('')
    try {
      const ps = (await store.listarPlanos(user)).sort((a, b) => a.criadoEm - b.criadoEm)
      setPlanos(ps)
      const id = (ps.find((p) => p.id === ativoId) ?? ps[0])?.id ?? ''
      await carregarDados(id)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar seus dados. Verifique a conexão e recarregue a página.')
    } finally {
      setCarregando(false)
    }
  }, [user, ativoId, carregarDados])

  useEffect(() => {
    void recarregar()
    // Recarrega só quando muda o usuário ou o plano ativo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, ativoId])

  const selecionar = (id: string) => {
    localStorage.setItem(CHAVE_ATIVO, id)
    setAtivoId(id)
  }

  const salvarDisc = async (d: Disciplina) => {
    await store.salvar(planoId, 'disciplines', d).catch(falha)
    setDiscs((ds) => [...ds.filter((x) => x.id !== d.id), d].sort((a, b) => a.ordem - b.ordem))
  }
  const salvarMeta = async (m: Meta) => {
    await store.salvar(planoId, 'metas', m).catch(falha)
    setMetas((ms) => [...ms.filter((x) => x.id !== m.id), m].sort((a, b) => a.numero - b.numero))
  }

  const metaAtual = metas[metas.length - 1]

  const value: PlanState = {
    planos,
    plano,
    souDono: !!plano && plano.ownerUid === user?.uid,
    discs,
    metas,
    metaAtual,
    aprofs,
    carregando,
    erro,
    selecionar,
    recarregar,
    criarPlano: async (nome) => {
      const p: Plano = {
        id: uid() + uid(),
        nome,
        ownerUid: user!.uid,
        ownerEmail: user!.email,
        studentEmail: '',
        atividadesPorMeta: 30,
        limiteReforco: 80,
        criadoEm: Date.now(),
      }
      await store.salvarPlano(p).catch(falha)
      setPlanos((ps) => [...ps, p])
      selecionar(p.id)
      return p
    },
    salvarPlano: async (p) => {
      await store.salvarPlano(p).catch(falha)
      setPlanos((ps) => ps.map((x) => (x.id === p.id ? p : x)))
    },
    excluirPlano: async (id) => {
      await store.excluirPlano(id).catch(falha)
      setPlanos((ps) => ps.filter((x) => x.id !== id))
      if (id === planoId) selecionar('')
    },
    duplicarPlano: async (id) => {
      const orig = planos.find((p) => p.id === id)
      if (!orig || !user) return
      const dados = id === planoId ? { discs } : await store.carregar(id).catch(falha)
      const p: Plano = { ...orig, id: uid() + uid(), nome: `${orig.nome} (cópia)`, ownerUid: user.uid, ownerEmail: user.email, studentEmail: '', criadoEm: Date.now() }
      await store.salvarPlano(p).catch(falha)
      for (const d of dados.discs) {
        const copia: Disciplina = { ...d, ciclo: 1, atividades: d.atividades.map((a) => ({ ...a, distribuida: false })) }
        await store.salvar(p.id, 'disciplines', copia).catch(falha)
      }
      setPlanos((ps) => [...ps, p])
    },
    salvarDisc,
    excluirDisc: async (id) => {
      await store.excluir(planoId, 'disciplines', id).catch(falha)
      setDiscs((ds) => ds.filter((x) => x.id !== id))
    },
    salvarItem: async (metaN, item) => {
      const m = metas.find((x) => x.numero === metaN)
      if (m) await salvarMeta({ ...m, itens: m.itens.map((i) => (i.id === item.id ? item : i)) })
    },
    adiarMeta: async () => {
      if (metaAtual && metaAtual.adiamentos === 0) await salvarMeta({ ...metaAtual, prazo: metaAtual.prazo + DIA, adiamentos: 1 })
    },
    iniciarProximaMeta: async () => {
      if (!plano || (metaAtual && !metaCompleta(metaAtual))) return
      const agora = Date.now()
      const g = gerarMeta(plano, discs, metaAtual, agora)
      if (g.meta.itens.length === 0) return
      for (const d of g.discs) await salvarDisc(d)
      if (metaAtual) await salvarMeta({ ...metaAtual, concluidaEm: agora })
      await salvarMeta(g.meta)
    },
    salvarAprof: async (a) => {
      await store.salvar(planoId, 'aprofundamentos', a).catch(falha)
      setAprofs((as) => [...as.filter((x) => x.id !== a.id), a].sort((x, y) => y.criadoEm - x.criadoEm))
    },
    excluirAprof: async (id) => {
      await store.excluir(planoId, 'aprofundamentos', id).catch(falha)
      setAprofs((as) => as.filter((x) => x.id !== id))
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlano() {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePlano precisa estar dentro de PlanProvider')
  return c
}
