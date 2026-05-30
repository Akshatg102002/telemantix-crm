import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  timezone: string
  currency: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string
  tenantId: string
}

interface AuthState {
  user: User | null
  tenant: Tenant | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, tenant: Tenant, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, tenant, accessToken, refreshToken) =>
        set({ user, tenant, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: user => set({ user }),
      logout: () => set({ user: null, tenant: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'tmx-auth', partialize: s => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user, tenant: s.tenant }) },
  ),
)
