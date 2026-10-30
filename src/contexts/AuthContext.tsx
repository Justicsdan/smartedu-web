import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthCtx {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('smartedu_token')
    const u = localStorage.getItem('smartedu_user')
    if (t && u) {
      setToken(t)
      setUser(JSON.parse(u))
    }
  }, [])

  const login = (t: string, u: AuthUser) => {
    setToken(t)
    setUser(u)
    localStorage.setItem('smartedu_token', t)
    localStorage.setItem('smartedu_user', JSON.stringify(u))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('smartedu_token')
    localStorage.removeItem('smartedu_user')
  }

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
