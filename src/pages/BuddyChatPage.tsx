import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Check, CheckCheck, Users, MoreVertical, Swords, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import ChallengeModal from '@/components/ChallengeModal'

interface Message {
  id: number
  sender_id: string
  content: string
  message_type: 'text' | 'congrats' | 'reminder'
  is_read: boolean
  created_at: string
}

interface Buddy {
  id: string
  display_name: string
  avatar_url?: string
  friendship_id: number
}

// Helper to get/set messages from localStorage
const STORAGE_KEY = 'sculpt_chat_messages'

function getStoredMessages(buddyId: string): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const allMessages = JSON.parse(stored) as Record<string, Message[]>
    return allMessages[buddyId] || []
  } catch {
    return []
  }
}

function saveMessages(buddyId: string, messages: Message[]) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const allMessages = stored ? JSON.parse(stored) : {}
    // Keep only last 100 messages per chat
    allMessages[buddyId] = messages.slice(-100)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allMessages))
  } catch {
    // Ignore storage errors
  }
}

export default function BuddyChatPage() {
  const { buddyId } = useParams<{ buddyId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<Message[]>(() =>
    buddyId ? getStoredMessages(buddyId) : []
  )
  const [showMenu, setShowMenu] = useState(false)
  const [showChallengeModal, setShowChallengeModal] = useState(false)

  // Get buddy info from navigation state (instant) or fallback to API
  const buddyFromState = location.state as { buddyName?: string; avatarUrl?: string; friendshipId?: number } | null

  const { data: buddies } = useQuery({
    queryKey: ['buddies'],
    queryFn: api.getBuddies,
  })

  const buddy = buddies?.find((b: Buddy) => b.id === buddyId)

  // Use state data first, then API data
  const displayName = buddyFromState?.buddyName || buddy?.display_name
  const avatarUrl = buddyFromState?.avatarUrl || buddy?.avatar_url
  const friendshipId = buddyFromState?.friendshipId || buddy?.friendship_id

  // Create buddy object for ChallengeModal - use API buddy if available, otherwise construct from state
  const buddyForModal = buddy || (buddyId && friendshipId ? {
    id: buddyId,
    display_name: displayName || 'Buddy',
    avatar_url: avatarUrl,
    friendship_id: friendshipId,
  } : null)

  // Remove buddy mutation
  const removeBuddyMutation = useMutation({
    mutationFn: (fId: number) => api.removeBuddy(fId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddies'] })
      navigate('/buddies')
    },
  })

  // Load messages from localStorage when buddyId changes
  const prevBuddyId = useRef(buddyId)
  useEffect(() => {
    if (buddyId && buddyId !== prevBuddyId.current) {
      prevBuddyId.current = buddyId
      // buddyId changed, update via external storage read
    }
  }, [buddyId])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (buddyId && messages.length > 0) {
      saveMessages(buddyId, messages)
    }
  }, [buddyId, messages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!messageInput.trim() || !user) return

    const newMessage: Message = {
      id: Date.now(),
      sender_id: user.id,
      content: messageInput.trim(),
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, newMessage])
    setMessageInput('')

    // Simulate read receipt
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.id === newMessage.id ? { ...m, is_read: true } : m)
      )
    }, 1500)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) return 'Heute'
    if (isYesterday) return 'Gestern'
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString()
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(msg)
    return acc
  }, {} as Record<string, Message[]>)

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <header className="sticky top-0 z-10 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] safe-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/buddies')}
            className="p-2 -ml-2 rounded-full hover:bg-[hsl(var(--surface-soft))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{displayName || 'Buddy'}</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Sculpt Buddy</p>
          </div>

          {/* 3-Punkt Menü */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-[hsl(var(--surface-soft))] transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 py-1 w-48 rounded-lg bg-[hsl(var(--popover))] border border-[hsl(var(--border))] shadow-lg z-20">
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[hsl(var(--surface-soft))] flex items-center gap-2"
                  onClick={() => {
                    setShowMenu(false)
                    setShowChallengeModal(true)
                  }}
                >
                  <Swords className="w-4 h-4" />
                  Challenge starten
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-[hsl(var(--surface-soft))] flex items-center gap-2"
                  onClick={() => {
                    setShowMenu(false)
                    if (friendshipId) {
                      removeBuddyMutation.mutate(friendshipId)
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Buddy entfernen
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Challenge Banner */}
      <div
        className="mx-4 mt-3 p-3 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))]/20 to-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/30 cursor-pointer hover:from-[hsl(var(--primary))]/30 transition-all"
        onClick={() => setShowChallengeModal(true)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
            <Swords className="w-5 h-5 text-gray-900" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Challenge {displayName}!</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Wer schafft diese Woche mehr? Fordere deinen Buddy heraus!
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4">
              <span className="text-4xl">💪</span>
            </div>
            <h2 className="font-semibold text-lg mb-1">
              Starte den Chat mit {buddy?.display_name || 'deinem Buddy'}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs">
              Motiviert euch gegenseitig und teilt eure Fortschritte!
            </p>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-[hsl(var(--surface-soft))] text-xs text-[hsl(var(--muted-foreground))]">
                    {formatDateHeader(msgs[0].created_at)}
                  </span>
                </div>

                <div className="space-y-1">
                  {msgs.map((msg, idx) => {
                    const isOwn = msg.sender_id === user?.id
                    const showTail = idx === msgs.length - 1 ||
                      msgs[idx + 1]?.sender_id !== msg.sender_id

                    return (
                      <div
                        key={msg.id}
                        className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] px-3 py-2 relative',
                            isOwn
                              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                              : 'bg-[hsl(var(--surface-soft))]',
                            showTail
                              ? isOwn ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'
                              : 'rounded-2xl'
                          )}
                        >
                          <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
                          <div className={cn(
                            'flex items-center justify-end gap-1 mt-1',
                            isOwn
                              ? 'text-[hsl(var(--primary-foreground))]/70'
                              : 'text-[hsl(var(--muted-foreground))]'
                          )}>
                            <span className="text-[11px]">{formatTime(msg.created_at)}</span>
                            {isOwn && (
                              msg.is_read
                                ? <CheckCheck className="w-4 h-4" />
                                : <Check className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] p-3 safe-bottom">
        <div className="flex items-end gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Nachricht schreiben..."
            className="flex-1 bg-[hsl(var(--surface-soft))] rounded-full px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/50 placeholder:text-[hsl(var(--muted-foreground))]"
          />
          <button
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-all',
              messageInput.trim()
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90'
                : 'bg-[hsl(var(--surface-soft))] text-[hsl(var(--muted-foreground))]'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && buddyForModal && (
        <ChallengeModal
          buddy={buddyForModal}
          buddies={buddies || []}
          onClose={() => setShowChallengeModal(false)}
          onSuccess={() => {
            setShowChallengeModal(false)
            queryClient.invalidateQueries({ queryKey: ['activeChallenges'] })
          }}
        />
      )}
    </div>
  )
}
