import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiPost, apiGet } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import type { AuthResponse, User, LoginRequest, RegisterRequest } from '@/types'

export function useLogin() {
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await apiPost<AuthResponse>('/auth/login', data)
      return res
    },
    onSuccess: (data) => {
      login(data.access_token, data.user)
    },
  })
}

export function useRegister() {
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await apiPost<AuthResponse>('/auth/register', data)
      return res
    },
    onSuccess: (data) => {
      login(data.access_token, data.user)
    },
  })
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await apiGet<User>('/auth/me')
      setUser(user)
      return user
    },
    enabled: !!token,
  })
}
