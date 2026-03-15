/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, startOfWeek } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Leaderboard Routes

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// GET /api/leaderboard - Get weekly leaderboard
async function handleGetLeaderboard(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const weekStart = startOfWeek()
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50'), 1), 100)

    // Get leaderboard data (Real Users + Fake Users)
    const result = await env.database.prepare(`
      SELECT * FROM (
        -- Real Users
        SELECT 
          u.id,
          u.display_name,
          u.avatar_url,
          u.current_level,
          u.league_id,
          lt.code as league_code,
          lt.name_de as league_name,
          lt.color_hex as league_color,
          COALESCE(SUM(ws.total_volume_kg), 0) as weekly_volume,
          COUNT(DISTINCT ws.id) as weekly_workouts
        FROM app_user u
        LEFT JOIN league_tier lt ON u.league_id = lt.id
        LEFT JOIN workout_session ws ON u.id = ws.user_id AND ws.started_at >= ?1
        WHERE u.onboarding_completed = 1
        GROUP BY u.id

        UNION ALL

        -- Fake Users
        SELECT 
          f.id,
          f.display_name,
          f.avatar_url,
          f.current_level,
          f.league_id,
          lt.code as league_code,
          lt.name_de as league_name,
          lt.color_hex as league_color,
          f.weekly_volume_kg as weekly_volume,
          f.weekly_workout_count as weekly_workouts
        FROM fake_user f
        LEFT JOIN league_tier lt ON f.league_id = lt.id
        WHERE f.is_active = 1
      )
      ORDER BY weekly_volume DESC
      LIMIT ?2
    `).bind(weekStart, limit).all()

    // Add ranking
    const leaderboard = (result.results || []).map((row: Record<string, unknown>, index: number) => ({
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

