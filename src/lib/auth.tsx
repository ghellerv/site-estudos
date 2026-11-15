import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'

type AuthState = {
  user: User | null
  carregando: boolean
  entrar: () => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Cria ou atualiza o perfil em users/{uid} a cada login.
async function salvarPerfil(user: User) {
  const ref = doc(db, 'users', user.uid)
  const existente = await getDoc(ref)
  await setDoc(
    ref,
    {
      nome: user.displayName ?? '',
      email: user.email ?? '',
      foto: user.photoURL ?? '',
      ultimoAcesso: serverTimestamp(),
      ...(existente.exists() ? {} : { criadoEm: serverTimestamp() }),
    },
    { merge: true },
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u)
        setCarregando(false)
        if (u) salvarPerfil(u).catch((e) => console.error('Erro ao salvar perfil', e))
      }),
    [],
  )

  const value: AuthState = {
    user,
    carregando,
    entrar: async () => {
      await signInWithPopup(auth, googleProvider)
    },
    sair: () => signOut(auth),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
