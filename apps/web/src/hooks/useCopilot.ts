import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api/client'
import type { Conversation, Message } from '@/types'

export function useConversations(projectId?: string) {
  return useQuery({
    queryKey: ['conversations', projectId],
    queryFn: async () => {
      const params = projectId ? `?project_id=${projectId}` : ''
      return apiGet<Conversation[]>(`/copilot/conversations${params}`)
    },
  })
}

export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () =>
      apiGet<Message[]>(`/copilot/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      conversationId,
      projectId,
      content,
    }: {
      conversationId?: string
      projectId?: string
      content: string
    }) => {
      return apiPost<Message>('/copilot/messages', {
        conversation_id: conversationId,
        project_id: projectId,
        content,
      })
    },
    onSuccess: (_, variables) => {
      if (variables.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['conversation-messages', variables.conversationId],
        })
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { project_id?: string; title: string }) =>
      apiPost<Conversation>('/copilot/conversations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
