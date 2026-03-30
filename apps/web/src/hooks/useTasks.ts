import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client'
import type { Task, TaskDependency, CursorPaginatedTasks } from '@/types'

export function useTasks(projectId: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      return apiGet<CursorPaginatedTasks>(
        `/projects/${projectId}/tasks?${params.toString()}`
      )
    },
    enabled: !!projectId,
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => apiGet<Task>(`/tasks/${taskId}`),
    enabled: !!taskId,
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
      apiPatch<Task>(`/tasks/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
    },
  })
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => apiDelete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}

export function useTaskPredecessors(taskId: string) {
  return useQuery({
    queryKey: ['task-predecessors', taskId],
    queryFn: async () => apiGet<TaskDependency[]>(`/tasks/${taskId}/dependencies/predecessors`),
    enabled: !!taskId,
  })
}

export function useTaskSuccessors(taskId: string) {
  return useQuery({
    queryKey: ['task-successors', taskId],
    queryFn: async () => apiGet<TaskDependency[]>(`/tasks/${taskId}/dependencies/successors`),
    enabled: !!taskId,
  })
}

export function useAddDependency(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { predecessor_id: string; type?: string; lag_days?: number }) =>
      apiPost<TaskDependency>(`/tasks/${taskId}/dependencies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-predecessors', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task-successors'] })
    },
  })
}

export function useDeleteDependency(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dependencyId: string) =>
      apiDelete(`/tasks/${taskId}/dependencies/${dependencyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-predecessors', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task-successors', taskId] })
    },
  })
}
