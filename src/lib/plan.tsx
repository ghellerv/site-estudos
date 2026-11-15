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
  recarregar: (silencioso?: boolean) => Promise<void>
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
    const cod = (e as { code?: string }).code
    setErro(`Não foi possível salvar. Nada foi perdido do que já estava gravado; tente de novo.${cod ? ` (${cod})` : ''}`)
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

  const recarregar = useCallback(async (silencioso = false) => {
    if (!user) return
    if (!silencioso) setCarregando(true)
    setErro('')
    try {
      const ps = (await store.listarPlanos(user)).sort((a, b) => a.criadoEm - b.criadoEm)
      setPlanos(ps)
      const id = (ps.find((p) => p.id === ativoId) ?? ps[0])?.id ?? ''
      await carregarDados(id)
    } catch (e) {
      console.error(e)
      const cod = (e as { code?: string }).code
      setErro(`Não foi possível carregar seus dados. Eles continuam gravados; recarregue a página.${cod ? ` (${cod})` : ''}`)
    } finally {
      setCarregando(false)
    }
  }, [user, ativoId, carregarDados])

  useEffect(() => {
    void recarregar()
    // Recarrega só quando muda o usuário ou o plano ativo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, ativoId])

  // Ao voltar para a aba, busca o que mudou em outro aparelho ou feito por outra pessoa.
  useEffect(() => {
    let ultimo = Date.now()
    const f = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimo > 15000) {
        ultimo = Date.now()
        void recarregar(true)
      }
    }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [recarregar])

  const selecionar = (id: string) => {
    localStorage.setItem(CHAVE_ATIVO, id)
    setAtivoId(id)
  }

  const porDisc = (d: Disciplina) => setDiscs((ds) => [...ds.filter((x) => x.id !== d.id), d].sort((a, b) => a.ordem - b.ordem))
  const porMeta = (m: Meta) => setMetas((ms) => [...ms.filter((x) => x.id !== m.id), m].sort((a, b) => a.numero - b.numero))

  /**
   * Salva a disciplina editada sem desfazer o que as metas já marcaram no servidor:
   * quais atividades foram distribuídas e em que ciclo a disciplina está.
   */
  const salvarDisc = async (d: Disciplina) => {
    const final = await store
      .atualizar<Disciplina>(planoId, 'disciplines', d.id, (atual) => {
        if (!atual) return d
        const flags = new Map(atual.atividades.map((a) => [a.id, a.distribuida]))
        return { ...d, ciclo: Math.max(d.ciclo, atual.ciclo), atividades: d.atividades.map((a) => ({ ...a, distribuida: flags.get(a.id) ?? a.distribuida })) }
      })
      .catch(falha)
    porDisc(final)
  }
  /** Altera uma meta a partir da versão mais recente no servidor. */
  const mudarMeta = async (id: string, fn: (m: Meta) => Meta) => {
    const atual = metas.find((m) => m.id === id)
    const final = await store.atualizar<Meta>(planoId, 'metas', id, (m) => fn(m ?? atual!)).catch(falha)
    porMeta(final)
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
      if (metas.some((x) => x.numero === metaN)) await mudarMeta(String(metaN), (m) => ({ ...m, itens: m.itens.map((i) => (i.id === item.id ? item : i)) }))
    },
    adiarMeta: async () => {
      if (metaAtual) await mudarMeta(metaAtual.id, (m) => (m.adiamentos === 0 ? { ...m, prazo: m.prazo + DIA, adiamentos: 1 } : m))
    },
    iniciarProximaMeta: async () => {
      if (!plano) return
      // Parte sempre dos dados mais recentes do servidor, não do que esta aba tinha carregado.
      const fresco = await store.carregar(plano.id).catch(falha)
      const ultima = fresco.metas.sort((a, b) => a.numero - b.numero)[fresco.metas.length - 1]
      if ((ultima?.numero ?? 0) !== (metaAtual?.numero ?? 0) || (ultima && !metaCompleta(ultima))) {
        // Outra aba ou pessoa já mexeu nesta meta: só mostra o estado atual.
        await recarregar(true)
        return
      }
      const agora = Date.now()
      const g = gerarMeta(plano, fresco.discs, ultima, agora)
      if (g.meta.itens.length === 0) return
      for (const d of g.discs) {
        const flags = new Map(d.atividades.map((a) => [a.id, a.distribuida]))
        const final = await store
          .atualizar<Disciplina>(plano.id, 'disciplines', d.id, (atual) =>
            atual ? { ...atual, ciclo: d.ciclo, atividades: atual.atividades.map((a) => ({ ...a, distribuida: flags.get(a.id) ?? a.distribuida })) } : d,
          )
          .catch(falha)
        porDisc(final)
      }
      if (ultima) await mudarMeta(ultima.id, (m) => ({ ...m, concluidaEm: m.concluidaEm ?? agora }))
      await store.salvar(plano.id, 'metas', g.meta).catch(falha)
      porMeta(g.meta)
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
