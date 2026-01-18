/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, startOfWeek } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Leaderboard & Level Routes

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
    const limit = parseInt(url.searchParams.get('limit') || '50')

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

    return jsonResponse(leaderboard)
  } catch (error) {
    console.error('Get leaderboard error:', error)
    return errorResponse('Failed to get leaderboard', 500)
  }
}

// GET /api/leagues - Get all leagues
async function handleGetLeagues(ctx: RequestContext): Promise<Response> {
  const { env } = ctx

  try {
    const result = await env.database.prepare(`
      SELECT * FROM league_tier ORDER BY tier_order
    `).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get leagues error:', error)
    return errorResponse('Failed to get leagues', 500)
  }
}

// GET /api/levels - Get all level definitions
async function handleGetLevels(ctx: RequestContext): Promise<Response> {
  const { env } = ctx

  try {
    const result = await env.database.prepare(`
      SELECT * FROM user_level ORDER BY level
    `).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get levels error:', error)
    return errorResponse('Failed to get levels', 500)
  }
}

// GET /api/users/me/level - Get user's level info
async function handleGetUserLevel(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const user = await env.database.prepare(
      'SELECT current_level, xp_total FROM app_user WHERE id = ?'
    ).bind(userId).first<{ current_level: number; xp_total: number }>()

    if (!user) {
      return errorResponse('User not found', 404)
    }

    // Get current level details
    const currentLevel = await env.database.prepare(
      'SELECT * FROM user_level WHERE level = ?'
    ).bind(user.current_level).first()

    // Get next level details
    const nextLevel = await env.database.prepare(
      'SELECT * FROM user_level WHERE level = ?'
    ).bind(user.current_level + 1).first<Record<string, unknown>>()

    // Calculate progress to next level
    const currentLevelXp = (currentLevel as Record<string, unknown>)?.xp_required || 0
    const nextLevelXp = nextLevel?.xp_required || (currentLevelXp as number) + 1000
    const xpProgress = user.xp_total - (currentLevelXp as number)
    const xpNeeded = (nextLevelXp as number) - (currentLevelXp as number)
    const progressPercent = Math.min(100, Math.round((xpProgress / xpNeeded) * 100))

    return jsonResponse({
      current_level: user.current_level,
      xp_total: user.xp_total,
      level_info: currentLevel,
      next_level: nextLevel,
      xp_progress: xpProgress,
      xp_needed: xpNeeded,
      progress_percent: progressPercent,
    })
  } catch (error) {
    console.error('Get user level error:', error)
    return errorResponse('Failed to get user level', 500)
  }
}

// GET /api/badges - Get all badges
async function handleGetBadges(ctx: RequestContext): Promise<Response> {
  const { env } = ctx

  try {
    const result = await env.database.prepare(`
      SELECT b.*, br.code as rarity_code, br.name_de as rarity_name, br.color_hex
      FROM badge b
      JOIN badge_rarity br ON b.rarity_id = br.id
      ORDER BY br.id, b.threshold_value
    `).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get badges error:', error)
    return errorResponse('Failed to get badges', 500)
  }
}

// GET /api/users/me/badges - Get user's earned badges
async function handleGetUserBadges(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const result = await env.database.prepare(`
      SELECT ub.earned_at, b.*, br.code as rarity_code, br.name_de as rarity_name, br.color_hex
      FROM user_badge ub
      JOIN badge b ON ub.badge_id = b.id
      JOIN badge_rarity br ON b.rarity_id = br.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `).bind(userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get user badges error:', error)
    return errorResponse('Failed to get user badges', 500)
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
    if (path === '/api/leaderboard') {
      return handleGetLeaderboard(ctx)
    }
    if (path === '/api/leagues') {
      return handleGetLeagues(ctx)
    }
    if (path === '/api/levels') {
      return handleGetLevels(ctx)
    }
    if (path === '/api/users/me/level') {
      return handleGetUserLevel(ctx)
    }
    if (path === '/api/badges') {
      return handleGetBadges(ctx)
    }
    if (path === '/api/users/me/badges') {
      return handleGetUserBadges(ctx)
    }
  }

  return errorResponse('Not found', 404)
}
