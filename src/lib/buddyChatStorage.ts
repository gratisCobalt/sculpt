export interface ChatMessage {
  id: number
  sender_id: string
  content: string
  message_type: 'text' | 'congrats' | 'reminder'
  is_read: boolean
  created_at: string
}

interface StoredConversation {
  buddyId: string
  messages: ChatMessage[]
}

const STORAGE_KEY = 'sculpt_chat_messages'

function getStoredConversations(storageKey: string): StoredConversation[] {
  const stored = localStorage.getItem(storageKey)
  if (!stored) return []

  const parsed: unknown = JSON.parse(stored)
  if (Array.isArray(parsed)) {
    return parsed.filter((conversation): conversation is StoredConversation => (
      typeof conversation === 'object'
      && conversation !== null
      && 'buddyId' in conversation
      && typeof conversation.buddyId === 'string'
      && 'messages' in conversation
      && Array.isArray(conversation.messages)
    ))
  }

  // Migrate the legacy object-shaped storage without writing user-provided property names.
  if (typeof parsed === 'object' && parsed !== null) {
    return Object.entries(parsed).flatMap(([storedBuddyId, storedMessages]) => (
      Array.isArray(storedMessages)
        ? [{ buddyId: storedBuddyId, messages: storedMessages as ChatMessage[] }]
        : []
    ))
  }

  return []
}

export function getStoredMessages(userId: string, buddyId: string): ChatMessage[] {
  try {
    const conversations = getStoredConversations(`${STORAGE_KEY}:${userId}`)
    return conversations.find((conversation) => conversation.buddyId === buddyId)?.messages || []
  } catch {
    return []
  }
}

export function saveMessages(userId: string, buddyId: string, messages: ChatMessage[]) {
  try {
    const storageKey = `${STORAGE_KEY}:${userId}`
    const conversations = getStoredConversations(storageKey)
    const existingConversation = conversations.find((conversation) => conversation.buddyId === buddyId)

    if (existingConversation) {
      existingConversation.messages = messages.slice(-100)
    } else {
      conversations.push({ buddyId, messages: messages.slice(-100) })
    }

    localStorage.setItem(storageKey, JSON.stringify(conversations))
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredMessages(userId: string, buddyId: string) {
  try {
    const storageKey = `${STORAGE_KEY}:${userId}`
    const conversations = getStoredConversations(storageKey)
    const remainingConversations = conversations.filter((conversation) => conversation.buddyId !== buddyId)
    localStorage.setItem(storageKey, JSON.stringify(remainingConversations))
  } catch {
    // Ignore storage errors
  }
}
