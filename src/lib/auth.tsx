import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { api, setUnauthorizedHandler, tokenStore } from "@/lib/api"
import type { Me } from "@/lib/types"

interface AuthState {
  token: string | null
  user: Me | undefined
  isLoading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(tokenStore.get)

  const signOutLocally = useCallback(() => {
    tokenStore.set(null)
    setToken(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => setUnauthorizedHandler(signOutLocally), [signOutLocally])

  const me = useQuery({ queryKey: ["me", token], queryFn: api.me, enabled: !!token, staleTime: 5 * 60_000, retry: false })

  const value = useMemo<AuthState>(
    () => ({
      token,
      user: me.data,
      isLoading: !!token && me.isPending,
      isAdmin: !!me.data?.is_admin,
      login: async (email, password) => {
        const { token } = await api.login(email, password)
        tokenStore.set(token)
        setToken(token)
      },
      register: async (data) => {
        const { token } = await api.register(data)
        tokenStore.set(token)
        setToken(token)
      },
      logout: async () => {
        await api.logout().catch(() => {})
        signOutLocally()
      },
    }),
    [token, me.data, me.isPending, signOutLocally],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth outside AuthProvider")
  return ctx
}
