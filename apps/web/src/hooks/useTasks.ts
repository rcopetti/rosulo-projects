import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api/client'
import type { Task, PaginatedResponse } from '@/types'

export function useTasks(projectId: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      return apiGet<PaginatedResponse<Task>>(
        `/projects/${projectId}/tasks?${params.toString()}`
      )
    },
    enabled: !!projectId,
  })
}

export function useTask(projectId: string, taskId: string) {
  return useQuery({
    queryKey: ['task', projectId, taskId],
    queryFn: async () => apiGet<Task>(`/projects/${projectId}/tasks/${taskId}`),
    enabled: !!projectId && !!taskId,
  })
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Task>) =>
      apiPost<Task>(`/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) =>
      apiPatch<Task>(`/projects/${projectId}/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}
