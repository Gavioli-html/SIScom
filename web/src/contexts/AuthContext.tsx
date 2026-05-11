import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, setAccessToken } from '../lib/api'

interface Usuario {
  id: number
  nome: string
  email: string
  role: string
  area: { id: number; slug: string; nome: string }
}

interface AuthState {
  usuario: Usuario | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ usuario: null, loading: true })

  const silentRefresh = useCallback(async () => {
    try {
      const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
      const data = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!data.ok) {
        setState({ usuario: null, loading: false })
        return
      }
      const { access_token } = await data.json()
      setAccessToken(access_token)

      const me = await api.get<{ usuario: Usuario }>('/auth/me').catch(() => null)
      setState({ usuario: me?.usuario ?? null, loading: false })
    } catch {
      setState({ usuario: null, loading: false })
    }
  }, [])

  useEffect(() => {
    silentRefresh()
    const interval = setInterval(silentRefresh, 13 * 60 * 1000)
    return () => clearInterval(interval)
  }, [silentRefresh])

  useEffect(() => {
    const handler = () => setState({ usuario: null, loading: false })
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const login = async (email: string, senha: string) => {
    const data = await api.post<{ access_token: string; usuario: Usuario }>(
      '/auth/login',
      { email, senha }
    )
    setAccessToken(data.access_token)
    setState({ usuario: data.usuario, loading: false })
  }

  const logout = async () => {
    await api.post('/auth/logout', {}).catch(() => null)
    setAccessToken(null)
    setState({ usuario: null, loading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
