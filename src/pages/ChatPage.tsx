import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, Plus, Trash2, MessageSquare, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export default function ChatPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const convs = await api.getConversations()
      setConversations(convs)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  async function loadConversation(id: string) {
    try {
      const conv = await api.getConversation(id)
      setActiveConversationId(id)
      setMessages(conv.messages.map(m => ({
        ...m,
        created_at: m.created_at,
      })))
      setShowSidebar(false)
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  async function deleteConversation(id: string) {
    try {
      await api.deleteConversation(id)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  function startNewConversation() {
    setActiveConversationId(null)
    setMessages([])
    setShowSidebar(false)
  }

  async function handleSend() {
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    // Add placeholder for assistant message
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }])

    try {
      const response = await api.chatStream({
        conversationId: activeConversationId || undefined,
        messages: [{ role: 'user', content: userMessage.content }],
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.conversationId) {
              setActiveConversationId(parsed.conversationId)
              continue
            }
            if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + `\n\n[Fehler: ${parsed.error}]` }
                  : m
              ))
              continue
            }
            if (parsed.content) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + parsed.content }
                  : m
              ))
            }
          } catch {
            // Skip unparseable
          }
        }
      }

      // Refresh conversations list
      await loadConversations()
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Entschuldigung, es gab ein Problem bei der Verarbeitung. Bitte versuche es erneut.' }
          : m
      ))
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-1">
              <MessageSquare className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h1 className="font-semibold">KI-Coach</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Immer für dich da
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={startNewConversation}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar overlay */}
      {showSidebar && (
        <div className="absolute inset-0 z-50 flex">
          <div className="w-72 bg-[hsl(var(--background))] border-r border-[hsl(var(--border))] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Chats</h2>
              <button onClick={() => setShowSidebar(false)}>
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={startNewConversation}
              className="w-full flex items-center gap-2 p-3 rounded-lg glass mb-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Neuer Chat
            </button>
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg mb-1 cursor-pointer text-sm',
                  activeConversationId === conv.id ? 'glass' : 'hover:bg-[hsl(var(--surface))]'
                )}
              >
                <span
                  className="truncate flex-1"
                  onClick={() => loadConversation(conv.id)}
                >
                  {conv.title || 'Neuer Chat'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                  className="p-1 opacity-50 hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setShowSidebar(false)} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <Bot className="w-12 h-12 mb-4 text-[hsl(var(--primary))]" />
            <p className="text-sm">
              Hallo {user?.display_name || 'Athlet'}! Wie kann ich dir helfen?
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 animate-fade-in',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.role === 'assistant'
                  ? 'gradient-primary'
                  : 'bg-[hsl(var(--surface-strong))]'
              )}
            >
              {message.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-gray-900" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3',
                message.role === 'assistant'
                  ? 'glass'
                  : 'gradient-primary text-gray-900'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content || '\u200B'}</p>
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-900" />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--primary))]" />
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Denkt nach...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="Schreibe eine Nachricht..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
