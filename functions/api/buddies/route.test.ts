import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/auth', () => ({
  getUserIdFromRequest: vi.fn().mockResolvedValue('user-1'),
}))

import { onRequest } from './[[route]]'
import type { Env } from '../../lib/types'

interface RecordedStatement {
  query: string
  bindings: unknown[]
}

type DatabaseResult = {
  first?: unknown
  results?: unknown[]
  changes?: number
}

class DatabaseStub {
  readonly statements: RecordedStatement[] = []

  constructor(private readonly resolve: (query: string, bindings: unknown[]) => DatabaseResult) {}

  prepare(query: string) {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim()
    return {
      bind: (...bindings: unknown[]) => {
        this.statements.push({ query: normalizedQuery, bindings })
        const result = this.resolve(normalizedQuery, bindings)
        return {
          first: async () => result.first ?? null,
          all: async () => ({ results: result.results ?? [] }),
          run: async () => ({ meta: { changes: result.changes ?? 1 } }),
        }
      },
    }
  }
}

function createContext(request: Request, database: DatabaseStub) {
  return {
    request,
    env: { database } as unknown as Env,
  } as unknown as Parameters<typeof onRequest>[0]
}

describe('buddy API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns pending and accepted connections in the frontend response shape', async () => {
    const connection = {
      friendship_id: 7,
      id: 'buddy-2',
      display_name: 'Alex',
      status: 'pending',
      direction: 'received',
    }
    const database = new DatabaseStub((query) => ({
      results: query.includes('FROM friendship f') ? [connection] : [],
    }))

    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies'),
      database
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([connection])
    expect(database.statements[0].query).toContain("fs.code IN ('pending', 'accepted')")
    expect(database.statements[0].query).toContain('as display_name')
  })

  it('rejects malformed buddy requests with a client error', async () => {
    const database = new DatabaseStub(() => ({}))
    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{broken',
      }),
      database
    ))

    expect(response.status).toBe(400)
    expect(database.statements).toHaveLength(0)
  })

  it('creates a buddy request with one guarded insert', async () => {
    const database = new DatabaseStub((query) => ({
      changes: query.includes('INSERT INTO friendship') ? 1 : 0,
    }))
    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'buddy-2' }),
      }),
      database
    ))

    expect(response.status).toBe(200)
    const insert = database.statements.find(({ query }) => query.includes('INSERT INTO friendship'))
    expect(insert?.query).toContain('WHERE EXISTS')
    expect(insert?.query).toContain('AND NOT EXISTS')
  })

  it('does not report success when a connection cannot be removed', async () => {
    const database = new DatabaseStub(() => ({ changes: 0 }))
    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies/999', { method: 'DELETE' }),
      database
    ))

    expect(response.status).toBe(404)
  })

  it('does not report success when a stale request is rejected', async () => {
    const database = new DatabaseStub(() => ({ changes: 0 }))
    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies/999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      }),
      database
    ))

    expect(response.status).toBe(404)
  })

  it('writes reminders with the actual notification schema', async () => {
    const database = new DatabaseStub((query) => {
      if (query.includes('SELECT * FROM friendship')) {
        return { first: { requester_id: 'user-1', addressee_id: 'buddy-2' } }
      }
      if (query.includes('SELECT n.id')) return { first: null }
      return { changes: 1 }
    })

    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies/7/remind', { method: 'POST' }),
      database
    ))

    expect(response.status).toBe(200)
    const insert = database.statements.find(({ query }) => query.includes('INSERT INTO notification'))
    expect(insert?.query).toContain('notification_type_id, sender_id, title, body, data')
    expect(insert?.query).not.toContain('title_de')
  })

  it('persists encrypted chat payloads to chat_message', async () => {
    const database = new DatabaseStub((query) => {
      if (query.includes('SELECT * FROM friendship')) return { first: { id: 7 } }
      if (query.includes('INSERT INTO chat_message')) return { first: { id: 11 } }
      return {}
    })

    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies/7/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedContent: 'ciphertext',
          ephemeralPublicKey: 'public-key',
          mac: 'mac',
          nonce: 'nonce',
        }),
      }),
      database
    ))

    expect(response.status).toBe(200)
    expect(database.statements.some(({ query }) => query.includes('INSERT INTO chat_message'))).toBe(true)
    expect(database.statements.some(({ query }) => query.includes('buddy_message'))).toBe(false)
  })

  it('returns encrypted messages in chronological order', async () => {
    const database = new DatabaseStub((query) => {
      if (query.includes('SELECT id FROM friendship')) return { first: { id: 7 } }
      if (query.includes('FROM chat_message')) {
        return { results: [{ id: 2, created_at: '2026-07-12T11:00:00Z' }, { id: 1, created_at: '2026-07-12T10:00:00Z' }] }
      }
      return {}
    })

    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies/7/messages?limit=50'),
      database
    ))

    expect(response.status).toBe(200)
    const messages = await response.json() as Array<{ id: number }>
    expect(messages.map(({ id }) => id)).toEqual([1, 2])
  })

  it('uses the message ID as a tie-breaker for paginated messages', async () => {
    const database = new DatabaseStub((query) => {
      if (query.includes('SELECT id FROM friendship')) return { first: { id: 7 } }
      if (query.includes('FROM chat_message')) return { results: [] }
      return {}
    })

    const response = await onRequest(createContext(
      new Request('https://sculpt.test/api/buddies/7/messages?before=2026-07-12T11%3A00%3A00Z&beforeId=42'),
      database
    ))

    expect(response.status).toBe(200)
    const query = database.statements.find(({ query }) => query.includes('FROM chat_message'))
    expect(query?.query).toContain('(created_at = ? AND id < ?)')
    expect(query?.bindings).toEqual([7, '2026-07-12T11:00:00Z', '2026-07-12T11:00:00Z', 42, 50])
  })
})
