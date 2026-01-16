import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hallo ${user?.display_name || 'Athlet'}! 👋 Ich bin dein KI-Fitness-Coach. Frag mich alles zu Training, Ernährung oder Technik!`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call Supabase Edge Function for Vertex AI
      if (!supabase) throw new Error('Supabase not initialized')
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: userMessage.content,
          context: {
            userName: user?.display_name,
            fitnessGoal: user?.fitness_goal,
            experience: user?.experience_level,
            frequency: user?.training_frequency_per_week,
          },
        },
      })

      if (error) throw error

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Entschuldigung, ich konnte keine Antwort generieren.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)

      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Entschuldigung, es gab ein Problem bei der Verarbeitung. Bitte versuche es erneut.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 animate-fade-in',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            {/* Avatar */}
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

            {/* Message Bubble */}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3',
                message.role === 'assistant'
                  ? 'glass'
                  : 'gradient-primary text-gray-900'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  'text-xs mt-1',
                  message.role === 'assistant'
                    ? 'text-[hsl(var(--muted-foreground))]'
                    : 'text-gray-700'
                )}
              >
                {message.timestamp.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
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
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
