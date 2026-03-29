import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client'
import type { WBSItem, WBSTree } from '@/types'

export function useWBSTree(projectId: string) {
  return useQuery({
    queryKey: ['wbs', projectId],
    queryFn: async () => apiGet<WBSTree>(`/projects/${projectId}/wbs`),
    enabled: !!projectId,
  })
}

export function useCreateWBSItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<WBSItem>) =>
      apiPost<WBSItem>(`/projects/${projectId}/wbs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', projectId] })
    },
  })
}

export function useUpdateWBSItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WBSItem> }) =>
      apiPatch<WBSItem>(`/projects/${projectId}/wbs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', projectId] })
    },
  })
}

export function useDeleteWBSItem(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      apiDelete(`/projects/${projectId}/wbs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', projectId] })
    },
  })
}
