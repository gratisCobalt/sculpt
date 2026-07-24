import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/auth', () => ({
  getUserIdFromRequest: vi.fn().mockResolvedValue('user-1'),
}))

import { onRequest } from './[[route]]'
import type { Env } from '../../lib/types'

type DatabaseResult = {
  first?: unknown
  results?: unknown[]
}

class DatabaseStub {
  constructor(private readonly resolve: (query: string) => DatabaseResult) {}

  prepare(query: string) {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim()
    return {
      bind: () => {
        const result = this.resolve(normalizedQuery)
        return {
          first: async () => result.first ?? null,
          all: async () => ({ results: result.results ?? [] }),
        }
      },
    }
  }
}

function createContext(database: DatabaseStub) {
  return {
    request: new Request('https://sculpt.test/api/leaderboard/weekly'),
    env: { database } as unknown as Env,
  } as unknown as Parameters<typeof onRequest>[0]
}

function realEntry(id: string, isBuddy: boolean, weeklyWorkouts: number) {
  return {
    id,
    display_name: id === 'user-1' ? 'Current User' : `Friend ${id}`,
    avatar_url: null,
    fitness_goal: 'health',
    current_streak: weeklyWorkouts,
    xp_total: 1000,
    current_level: 5,
    league_id: 1,
    league_code: 'bronze',
    league_name: 'Bronze Liga',
    league_color: '#CD7F32',
    weekly_volume_kg: 0,
    weekly_volume: 0,
    weekly_training_days: weeklyWorkouts,
    weekly_workout_count: weeklyWorkouts,
    weekly_workouts: weeklyWorkouts,
    is_fake: 0,
    is_buddy: isBuddy ? 1 : 0,
  }
}

function leaderboardDatabase(entries: unknown[]) {
  return new DatabaseStub((query) => {
    if (query.includes('WITH accepted_friends')) return { results: entries }
    if (query.includes('SELECT u.league_id')) return { first: null }
    return {}
  })
}

describe('leaderboard API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('counts at most one completed training day per calendar date', async () => {
    let leaderboardQuery = ''
    const database = new DatabaseStub((query) => {
      if (query.includes('WITH accepted_friends')) {
        leaderboardQuery = query
        return { results: [realEntry('user-1', false, 1)] }
      }
      if (query.includes('SELECT u.league_id')) return { first: null }
      return {}
    })

    const response = await onRequest(createContext(database))

    expect(response.status).toBe(200)
    expect(leaderboardQuery).toContain('COUNT(DISTINCT date(ws.started_at)) as weekly_training_days')
    expect(leaderboardQuery).toContain('ws.completed_at IS NOT NULL')
  })

  it('returns first names only for real and fake leaderboard users', async () => {
    const currentUser = realEntry('user-1', false, 1)
    currentUser.display_name = 'Anna🇩🇪 Beispiel'
    const response = await onRequest(createContext(leaderboardDatabase([currentUser])))

    expect(response.status).toBe(200)
    const body = await response.json() as { leaderboard: Array<{ id: string; display_name: string }> }
    expect(body.leaderboard.find((entry) => entry.id === 'user-1')?.display_name).toBe('Anna')
    expect(body.leaderboard.every((entry) => !/\s/.test(entry.display_name))).toBe(true)
  })

  it('fills users without buddies with 9 realistic fake leaderboard entries', async () => {
    const response = await onRequest(createContext(leaderboardDatabase([
      realEntry('user-1', false, 0),
    ])))

    expect(response.status).toBe(200)
    const body = await response.json() as { leaderboard: Array<{ is_fake: boolean | number; weekly_workout_count: number }> }
    expect(body.leaderboard.filter((entry) => entry.is_fake).length).toBe(9)
    expect(body.leaderboard).toHaveLength(10)
    expect(body.leaderboard.map((entry) => entry.weekly_workout_count)).toEqual(
      [...body.leaderboard.map((entry) => entry.weekly_workout_count)].sort((a, b) => b - a)
    )
  })

  it('fills users with fewer than 9 buddies only up to the buddy target', async () => {
    const response = await onRequest(createContext(leaderboardDatabase([
      realEntry('user-1', false, 1),
      realEntry('friend-1', true, 2),
      realEntry('friend-2', true, 0),
    ])))

    expect(response.status).toBe(200)
    const body = await response.json() as { leaderboard: Array<{ is_fake: boolean | number; is_buddy: boolean | number }> }
    expect(body.leaderboard.filter((entry) => entry.is_buddy).length).toBe(2)
    expect(body.leaderboard.filter((entry) => entry.is_fake).length).toBe(7)
  })

  it('does not show fake users once the user has at least 9 buddies', async () => {
    const entries = [
      realEntry('user-1', false, 4),
      ...Array.from({ length: 9 }, (_, index) => realEntry(`friend-${index + 1}`, true, index % 6)),
    ]

    const response = await onRequest(createContext(leaderboardDatabase(entries)))

    expect(response.status).toBe(200)
    const body = await response.json() as { leaderboard: Array<{ is_fake: boolean | number; is_buddy: boolean | number }> }
    expect(body.leaderboard.filter((entry) => entry.is_buddy).length).toBe(9)
    expect(body.leaderboard.filter((entry) => entry.is_fake).length).toBe(0)
  })
})
