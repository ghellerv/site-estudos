import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { MODO_DEMO } from './store'
import type { Usuario } from './types'

type AuthState = {
  user: Usuario | null
  carregando: boolean
  entrar: () => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const DEMO: Usuario = { uid: 'demo', email: 'demo@exemplo.com', nome: 'Demonstração' }

// Cria ou atualiza o perfil em users/{uid} a cada login.
async function salvarPerfil(user: User) {
  await setDoc(
    doc(db, 'users', user.uid),
    { nome: user.displayName ?? '', email: user.email ?? '', foto: user.photoURL ?? '', ultimoAcesso: serverTimestamp() },
    { merge: true },
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(MODO_DEMO ? DEMO : null)
  const [carregando, setCarregando] = useState(!MODO_DEMO)

  useEffect(() => {
    if (MODO_DEMO) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, email: (u.email ?? '').toLowerCase(), nome: u.displayName ?? '', foto: u.photoURL ?? undefined } : null)
      setCarregando(false)
      if (u) salvarPerfil(u).catch((e) => console.error('Erro ao salvar perfil', e))
    })
  }, [])

  const value: AuthState = {
    user,
    carregando,
    entrar: async () => {
      await signInWithPopup(auth, googleProvider)
    },
    sair: async () => {
      if (!MODO_DEMO) await signOut(auth)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
