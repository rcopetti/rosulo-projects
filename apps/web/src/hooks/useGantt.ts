import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api/client'
import type { GanttData } from '@/components/features/schedule/GanttChart'

export function useGantt(projectId: string) {
  return useQuery<GanttData>({
    queryKey: ['gantt', projectId],
    queryFn: async () => apiGet<GanttData>(`/projects/${projectId}/gantt`),
    enabled: !!projectId,
  })
}
