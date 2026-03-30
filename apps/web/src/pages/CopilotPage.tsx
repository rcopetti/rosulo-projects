import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useConversations, useConversationMessages, useSendMessage, useCreateConversation, useDeleteConversation } from '@/hooks/useCopilot'
import { useCopilotStore } from '@/stores/copilotStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'
import { Send, Bot, Sparkles, MessageSquarePlus, Trash2 } from 'lucide-react'
import type { Message } from '@/types'

export function CopilotPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((s) => s.user)
  const { isStreaming, setStreaming } = useCopilotStore()

  const { data: conversations } = useConversations(projectId!)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)

  const { data: messagesData, isLoading: messagesLoading } = useConversationMessages(activeConversationId || '')
  const sendMessage = useSendMessage()
  const createConversation = useCreateConversation()
  const deleteConversation = useDeleteConversation()

  const messages = messagesData || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim() || isStreaming || !projectId) return

    const content = input
    setInput('')
    setStreaming(true)

    sendMessage.mutate(
      {
        conversationId: activeConversationId || undefined,
        projectId,
        content,
      },
      {
        onSuccess: () => {
          setStreaming(false)
        },
        onError: () => {
          setStreaming(false)
        },
      }
    )
  }

  function handleNewConversation() {
    createConversation.mutate(
      { project_id: projectId, title: 'New Conversation' },
      {
        onSuccess: (conv) => setActiveConversationId(conv.id),
      }
    )
  }

  function handleDeleteConversation() {
    if (!deleteConversationId) return
    const idToDelete = deleteConversationId
    deleteConversation.mutate(idToDelete, {
      onSuccess: () => {
        if (activeConversationId === idToDelete) {
          setActiveConversationId(null)
        }
        setDeleteConversationId(null)
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {!projectId ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border bg-card text-center">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Select a project</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a project to use the AI copilot with project context.
          </p>
        </div>
      ) : (
      <>
      <div className="hidden w-64 flex-col rounded-lg border bg-card lg:flex">
        <div className="border-b p-3">
          <Button variant="outline" className="w-full justify-start" onClick={handleNewConversation}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations?.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                'group flex items-center gap-1 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                activeConversationId === conv.id && 'bg-accent'
              )}
            >
              <button
                onClick={() => setActiveConversationId(conv.id)}
                className="min-w-0 flex-1"
              >
                <p className="truncate font-medium">{conv.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {new Date(conv.created_at).toLocaleDateString()}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteConversationId(conv.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          {conversations?.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No conversations yet</p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold">PM AI Copilot</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messagesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-16 w-2/3" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Start a conversation</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask the AI copilot anything about your project
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} userName={user?.name || 'You'} />
              ))}
              {isStreaming && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <div className="flex gap-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask the AI copilot..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isStreaming} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            AI responses may not always be accurate. Verify important information.
          </p>
        </div>
      </div>
      </>
      )}

      <ConfirmDialog
        open={!!deleteConversationId}
        onOpenChange={(open) => !open && setDeleteConversationId(null)}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        onConfirm={handleDeleteConversation}
        isPending={deleteConversation.isPending}
      />
    </div>
  )
}

function ChatMessage({ message, userName }: { message: Message; userName: string }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8">
        {isUser ? (
          <AvatarFallback>{getInitials(userName)}</AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
      </div>
    </div>
  )
}
