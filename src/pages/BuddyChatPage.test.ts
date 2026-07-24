import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStoredMessages, getStoredMessages, saveMessages, type ChatMessage } from '@/lib/buddyChatStorage'

const userId = 'user-1'
const normalBuddyId = 'buddy-1'
const unsafeBuddyId = '__proto__'

function message(id: number): ChatMessage {
  return {
    id,
    sender_id: userId,
    content: `Message ${id}`,
    message_type: 'text',
    is_read: false,
    created_at: '2026-07-24T22:00:00.000Z',
  }
}

describe('buddy chat storage', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      clear: () => values.clear(),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('stores route-provided buddy IDs as array values instead of object properties', () => {
    saveMessages(userId, normalBuddyId, [message(1)])
    saveMessages(userId, unsafeBuddyId, [message(2)])

    expect(getStoredMessages(userId, normalBuddyId)).toEqual([message(1)])
    expect(getStoredMessages(userId, unsafeBuddyId)).toEqual([message(2)])
    expect(JSON.parse(localStorage.getItem('sculpt_chat_messages:user-1') || '[]')).toEqual([
      { buddyId: normalBuddyId, messages: [message(1)] },
      { buddyId: unsafeBuddyId, messages: [message(2)] },
    ])
  })

  it('removes only the selected conversation', () => {
    saveMessages(userId, normalBuddyId, [message(1)])
    saveMessages(userId, unsafeBuddyId, [message(2)])

    clearStoredMessages(userId, unsafeBuddyId)

    expect(getStoredMessages(userId, normalBuddyId)).toEqual([message(1)])
    expect(getStoredMessages(userId, unsafeBuddyId)).toEqual([])
  })
})
