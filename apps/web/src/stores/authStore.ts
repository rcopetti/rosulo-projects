import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  activeOrgId: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
  setActiveOrgId: (orgId: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      activeOrgId: null,
      isAuthenticated: false,
      login: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          activeOrgId: null,
          isAuthenticated: false,
        }),
      setUser: (user) => set({ user }),
      setActiveOrgId: (orgId) => set({ activeOrgId: orgId }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        activeOrgId: state.activeOrgId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
