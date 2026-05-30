import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SuperAdminUser {
  id: string
  name: string
  email: string
}

interface SuperAdminState {
  admin: SuperAdminUser | null
  token: string | null
  setAuth: (admin: SuperAdminUser, token: string) => void
  logout: () => void
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    set => ({
      admin: null,
      token: null,
      setAuth: (admin, token) => set({ admin, token }),
      logout: () => set({ admin: null, token: null }),
    }),
    { name: 'tmx-super-admin' },
  ),
)
