"use client"

import * as React from "react"
import { authApi, clearToken, getToken, setToken } from "@/lib/api"
import type { Role, User } from "@/lib/types"

type AuthState = {
  user: User | null
  status: "loading" | "authenticated" | "anonymous"
  login: (email: string, password: string) => Promise<User>
  register: (input: {
    name: string
    email: string
    password: string
    phone?: string
  }) => Promise<User>
  logout: () => void
}

const AuthContext = React.createContext<AuthState | null>(null)

export const PORTAL_PATH: Record<Role, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  ADMIN: "/admin",
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [status, setStatus] = React.useState<AuthState["status"]>("loading")

  React.useEffect(() => {
    const controller = new AbortController()
    if (!getToken()) {
      setStatus("anonymous")
      return
    }
    authApi
      .me(controller.signal)
      .then((me) => {
        setUser(me)
        setStatus("authenticated")
      })
      .catch((error) => {
        if ((error as Error)?.name === "AbortError") return
        console.log("[v0] session restore failed:", (error as Error).message)
        clearToken()
        setUser(null)
        setStatus("anonymous")
      })
    return () => controller.abort()
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const { token, user: nextUser } = await authApi.login(email, password)
    setToken(token)
    setUser(nextUser)
    setStatus("authenticated")
    return nextUser
  }, [])

  const register = React.useCallback(
    async (input: {
      name: string
      email: string
      password: string
      phone?: string
    }) => {
      const { token, user: nextUser } = await authApi.register(input)
      setToken(token)
      setUser(nextUser)
      setStatus("authenticated")
      return nextUser
    },
    []
  )

  const logout = React.useCallback(() => {
    clearToken()
    setUser(null)
    setStatus("anonymous")
  }, [])

  const value = React.useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>")
  return context
}
