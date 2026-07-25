/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, startOfWeek } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Leaderboard Routes

const LEADERBOARD_FILL_TARGET = 9

const FAKE_LEADERBOARD_USERS = [
  { id: 'fake-rank-lea-1', display_name: 'Lea', fitness_goal: 'strength', current_streak: 12, xp_total: 18400, current_level: 19, league_id: 3, weekly_workout_count: 6 },
  { id: 'fake-rank-jonas-2', display_name: 'Jonas', fitness_goal: 'muscle_gain', current_streak: 8, xp_total: 14200, current_level: 17, league_id: 3, weekly_workout_count: 5 },
  { id: 'fake-rank-marie-3', display_name: 'Marie', fitness_goal: 'health', current_streak: 6, xp_total: 9600, current_level: 14, league_id: 2, weekly_workout_count: 5 },
  { id: 'fake-rank-felix-4', display_name: 'Felix', fitness_goal: 'endurance', current_streak: 9, xp_total: 12100, current_level: 16, league_id: 3, weekly_workout_count: 4 },
  { id: 'fake-rank-sarah-5', display_name: 'Sarah', fitness_goal: 'weight_loss', current_streak: 4, xp_total: 7200, current_level: 12, league_id: 2, weekly_workout_count: 4 },
  { id: 'fake-rank-niklas-6', display_name: 'Niklas', fitness_goal: 'strength', current_streak: 3, xp_total: 6800, current_level: 11, league_id: 2, weekly_workout_count: 3 },
  { id: 'fake-rank-anna-7', display_name: 'Anna', fitness_goal: 'health', current_streak: 5, xp_total: 5400, current_level: 10, league_id: 2, weekly_workout_count: 3 },
  { id: 'fake-rank-tobias-8', display_name: 'Tobias', fitness_goal: 'muscle_gain', current_streak: 2, xp_total: 3900, current_level: 8, league_id: 1, weekly_workout_count: 2 },
  { id: 'fake-rank-lena-9', display_name: 'Lena', fitness_goal: 'endurance', current_streak: 1, xp_total: 2600, current_level: 6, league_id: 1, weekly_workout_count: 2 },
]

function toLeaderboardFirstName(displayName: string): string {
  const firstToken = displayName.trim().split(/\s+/)[0] || ''
  const withoutEmoji = firstToken
    .replace(/[\d#*]\uFE0F?\u20E3|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200D|\uFE0E|\uFE0F/gu, '')
    .trim()

  return withoutEmoji || 'Mitglied'
}

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

interface LeaderboardEntry {
  id: string
  display_name: string
  avatar_url: string | null
  fitness_goal: string | null
  current_streak: number
  xp_total: number
  current_level: number
  league_id: number | null
  league_code: string | null
  league_name: string | null
  league_color: string | null
  weekly_volume_kg: number
  weekly_volume: number
  weekly_training_days: number
  weekly_workout_count: number
  weekly_workouts: number
  is_fake: boolean
  is_buddy: boolean
  rank?: number
  isCurrentUser?: boolean
}

// GET /api/leaderboard - Get weekly leaderboard
async function handleGetLeaderboard(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const weekStart = startOfWeek()

    const result = await env.database.prepare(`
      WITH accepted_friends AS (
        SELECT
          CASE
            WHEN requester_id = ?1 THEN addressee_id
            ELSE requester_id
          END AS friend_id
        FROM friendship f
        JOIN friendship_status fs ON fs.id = f.status_id
        WHERE fs.code = 'accepted'
          AND (requester_id = ?1 OR addressee_id = ?1)
      ),
      participants AS (
        SELECT ?1 AS user_id, 0 AS is_buddy
        UNION
        SELECT friend_id AS user_id, 1 AS is_buddy FROM accepted_friends
      )
      SELECT
          u.id,
          u.display_name,
          u.avatar_url,
          u.fitness_goal,
          u.current_streak,
          u.xp_total,
          u.current_level,
          u.league_id,
          lt.code as league_code,
          lt.name_de as league_name,
          lt.color_hex as league_color,
          COALESCE(SUM(ws.total_volume_kg), 0) as weekly_volume_kg,
          COALESCE(SUM(ws.total_volume_kg), 0) as weekly_volume,
          COUNT(DISTINCT date(ws.started_at)) as weekly_training_days,
          COUNT(DISTINCT date(ws.started_at)) as weekly_workout_count,
          COUNT(DISTINCT date(ws.started_at)) as weekly_workouts,
          0 as is_fake,
          p.is_buddy as is_buddy
        FROM participants p
        JOIN app_user u ON u.id = p.user_id
        LEFT JOIN league_tier lt ON u.league_id = lt.id
        LEFT JOIN workout_session ws ON u.id = ws.user_id
          AND ws.started_at >= ?2
          AND ws.completed_at IS NOT NULL
        WHERE u.onboarding_completed = 1
        GROUP BY u.id, p.is_buddy
    `).bind(userId, weekStart).all<LeaderboardEntry>()

    const realEntries = (result.results || []).map((entry) => ({
      ...entry,
      display_name: toLeaderboardFirstName(entry.display_name),
    }))
    const friendCount = realEntries.filter((entry) => Boolean(entry.is_buddy)).length
    const fakeCount = Math.max(0, LEADERBOARD_FILL_TARGET - friendCount)

    const fakeEntries: LeaderboardEntry[] = fakeCount === 0 ? [] : FAKE_LEADERBOARD_USERS.slice(0, fakeCount).map((fake) => ({
      ...fake,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fake.display_name)}&background=1f2937&color=fff&size=128`,
      league_code: null,
      league_name: null,
      league_color: null,
      weekly_volume_kg: 0,
      weekly_volume: 0,
      weekly_training_days: fake.weekly_workout_count,
      weekly_workouts: fake.weekly_workout_count,
      is_fake: true,
      is_buddy: false,
    }))

    const sortedEntries = [...realEntries, ...fakeEntries].sort((a, b) => {
      if (b.weekly_workout_count !== a.weekly_workout_count) {
        return b.weekly_workout_count - a.weekly_workout_count
      }
      if (b.current_streak !== a.current_streak) {
        return b.current_streak - a.current_streak
      }
      if (b.current_level !== a.current_level) {
        return b.current_level - a.current_level
      }
      return a.display_name.localeCompare(b.display_name, 'de')
    })

    const leaderboard = sortedEntries.map((row, index) => ({
      ...row,
      rank: index + 1,
      isCurrentUser: row.id === userId,
    }))

    // Find current user's rank
    const currentUserEntry = leaderboard.find(entry => (entry as Record<string, unknown>).id === userId)
    const currentUserRank = currentUserEntry?.rank || 0

    // Get user's league and level info
    const userInfo = await env.database.prepare(`
      SELECT u.league_id, lt.*, lv.level, lv.name_de as level_name, lv.xp_required
      FROM app_user u
      LEFT JOIN league_tier lt ON u.league_id = lt.id
      LEFT JOIN user_level lv ON u.current_level = lv.level
      WHERE u.id = ?
    `).bind(userId).first<Record<string, unknown>>()

    return jsonResponse({
      leaderboard,
      currentUserRank,
      totalParticipants: leaderboard.length,
      league: userInfo?.league_id ? {
        id: userInfo.league_id,
        code: userInfo.code,
        name_de: userInfo.name_de,
        color_hex: userInfo.color_hex
      } : null,
      level: userInfo?.level ? {
        level_number: userInfo.level,
        title_de: userInfo.level_name,
        min_xp: userInfo.xp_required,
        max_xp: null
      } : null,
      nextLevel: null
    })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    return errorResponse('Failed to get leaderboard', 500)
  }
}

// Main request handler
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const ctx: RequestContext = { request, env, url }

  if (request.method === 'GET') {
    // Leaderboard routes
    if (path === '/api/leaderboard' || path === '/api/leaderboard/weekly') {
      return handleGetLeaderboard(ctx)
    }
  }

  return errorResponse('Not found', 404)
}
