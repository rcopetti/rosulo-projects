import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiPost, apiGet } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import type { TokenResponse, User, Organization, LoginRequest, RegisterRequest } from '@/types'

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const tokens = await apiPost<TokenResponse>('/auth/login', data)
      return tokens
    },
    onSuccess: async (tokens) => {
      useAuthStore.getState().login(tokens.access_token, null as unknown as User)
      const user = await apiGet<User>('/auth/me')
      useAuthStore.getState().setUser(user)
      queryClient.setQueryData(['currentUser'], user)
      await loadActiveOrg()
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const tokens = await apiPost<TokenResponse>('/auth/register', data)
      return tokens
    },
    onSuccess: async (tokens) => {
      useAuthStore.getState().login(tokens.access_token, null as unknown as User)
      const user = await apiGet<User>('/auth/me')
      useAuthStore.getState().setUser(user)
      queryClient.setQueryData(['currentUser'], user)
      await loadActiveOrg()
    },
  })
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await apiGet<User>('/auth/me')
      useAuthStore.getState().setUser(user)
      return user
    },
    enabled: !!token && isAuthenticated,
    retry: false,
  })
}

export function useMyOrgs() {
  const token = useAuthStore((s) => s.token)
  return useQuery<Organization[]>({
    queryKey: ['myOrgs'],
    queryFn: async () => apiGet<Organization[]>('/users/me/orgs'),
    enabled: !!token,
  })
}

async function loadActiveOrg() {
  const store = useAuthStore.getState()
  if (store.activeOrgId) return
  const orgs = await apiGet<Organization[]>('/users/me/orgs')
  if (orgs.length > 0) {
    store.setActiveOrgId(orgs[0].id)
  }
}
