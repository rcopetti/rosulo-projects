import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api/client'
import type { Conversation, Message } from '@/types'

export function useConversations(projectId: string) {
  return useQuery({
    queryKey: ['conversations', projectId],
    queryFn: async () =>
      apiGet<Conversation[]>(`/copilot/conversations?project_id=${projectId}`),
    enabled: !!projectId,
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
      projectId: string
      content: string
    }) => {
      return apiPost<{ message: string; conversation_id: string; message_id: string }>('/copilot/chat', {
        conversation_id: conversationId,
        project_id: projectId,
        message: content,
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
