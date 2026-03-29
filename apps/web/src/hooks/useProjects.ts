import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import type { Project, PaginatedResponse } from '@/types'

export function useProjects(orgId?: string) {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)
  const resolvedOrgId = orgId || activeOrgId
  return useQuery({
    queryKey: ['projects', resolvedOrgId],
    queryFn: async () => apiGet<Project[]>(`/orgs/${resolvedOrgId}/projects`),
    enabled: !!resolvedOrgId,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => apiGet<Project>(`/projects/${id}`),
    enabled: !!id,
  })
}

export function useCreateProject(orgId?: string) {
  const queryClient = useQueryClient()
  const activeOrgId = useAuthStore((s) => s.activeOrgId)
  const resolvedOrgId = orgId || activeOrgId
  return useMutation({
    mutationFn: async (data: Partial<Project>) =>
      apiPost<Project>(`/orgs/${resolvedOrgId}/projects`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', resolvedOrgId] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) =>
      apiPatch<Project>(`/projects/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] })
    },
  })
}
