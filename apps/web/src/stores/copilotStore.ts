import { create } from 'zustand'
import type { Message } from '@/types'

interface CopilotState {
  conversations: Map<string, Message[]>
  activeConversationId: string | null
  isStreaming: boolean
  addMessage: (conversationId: string, message: Message) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  setStreaming: (streaming: boolean) => void
  setActiveConversation: (id: string | null) => void
}

export const useCopilotStore = create<CopilotState>()((set) => ({
  conversations: new Map(),
  activeConversationId: null,
  isStreaming: false,
  addMessage: (conversationId, message) =>
    set((state) => {
      const convos = new Map(state.conversations)
      const existing = convos.get(conversationId) || []
      convos.set(conversationId, [...existing, message])
      return { conversations: convos }
    }),
  setMessages: (conversationId, messages) =>
    set((state) => {
      const convos = new Map(state.conversations)
      convos.set(conversationId, messages)
      return { conversations: convos }
    }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
}))
