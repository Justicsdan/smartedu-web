import { createContext, useContext, useState, type ReactNode } from 'react'

interface AuthUser {
  id: string
  role: string
  [key: string]: any
}

interface AuthCtx {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smartedu_token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const u = localStorage.getItem('smartedu_user')
    return u ? JSON.parse(u) : null
  })

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
