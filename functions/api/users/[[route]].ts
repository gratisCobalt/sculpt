/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// User API Routes for Cloudflare Pages Functions
// Handles: PATCH /api/users/me, POST /api/users/me/focus-areas, GET /api/users/search

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// PATCH /api/users/me - Update current user
async function handleUpdateMe(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as Record<string, unknown>
    const {
      display_name,
      gender_id,
      body_weight_kg,
      training_frequency_per_week,
      fitness_goal,
      experience_level,
      onboarding_completed
    } = body

    // Build dynamic update query
    const updates: string[] = ['updated_at = ?']
    const params: unknown[] = [nowISO()]

    if (display_name !== undefined) {
      updates.push('display_name = ?')
      params.push(display_name)
    }
    if (gender_id !== undefined) {
      updates.push('gender_id = ?')
      params.push(gender_id)
    }
    if (body_weight_kg !== undefined) {
      updates.push('body_weight_kg = ?')
      params.push(body_weight_kg)
    }
    if (training_frequency_per_week !== undefined) {
      updates.push('training_frequency_per_week = ?')
      params.push(training_frequency_per_week)
    }
    if (fitness_goal !== undefined) {
      updates.push('fitness_goal = ?')
      params.push(fitness_goal)
    }
    if (experience_level !== undefined) {
      updates.push('experience_level = ?')
      params.push(experience_level)
    }
    if (onboarding_completed !== undefined) {
      updates.push('onboarding_completed = ?')
      params.push(onboarding_completed ? 1 : 0)
    }

    params.push(userId)

    await env.database.prepare(`
      UPDATE app_user SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run()

    // Get updated user
    const user = await env.database.prepare(
      'SELECT * FROM app_user WHERE id = ?'
    ).bind(userId).first()

    return jsonResponse(user)
  } catch (error) {
    console.error('Update user error:', error)
    return errorResponse('Failed to update user', 500)
  }
}

// POST /api/users/me/focus-areas - Set user focus areas
async function handleSetFocusAreas(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as { body_part_ids: number[] }
    const { body_part_ids } = body

    if (!Array.isArray(body_part_ids)) {
      return errorResponse('body_part_ids must be an array', 400)
    }

    // Clear existing
    await env.database.prepare(
      'DELETE FROM user_focus_area WHERE user_id = ?'
    ).bind(userId).run()

    // Insert new with priority
    const now = nowISO()
    for (let i = 0; i < body_part_ids.length; i++) {
      await env.database.prepare(
        'INSERT INTO user_focus_area (user_id, body_part_id, priority, created_at) VALUES (?, ?, ?, ?)'
      ).bind(userId, body_part_ids[i], i + 1, now).run()
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Update focus areas error:', error)
    return errorResponse('Failed to update focus areas', 500)
  }
}

// GET /api/users/me/focus-areas - Get user focus areas
async function handleGetFocusAreas(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const result = await env.database.prepare(`
      SELECT ufa.*, bp.code, bp.name_de, bp.name_en, bp.icon_name
      FROM user_focus_area ufa
      JOIN body_part bp ON ufa.body_part_id = bp.id
      WHERE ufa.user_id = ?
      ORDER BY ufa.priority
    `).bind(userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get focus areas error:', error)
    return errorResponse('Failed to get focus areas', 500)
  }
}

// GET /api/users/search - Search users (for buddy feature)
async function handleSearchUsers(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const query = url.searchParams.get('q') || ''
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)

    if (query.length < 2) {
      return jsonResponse([])
    }

    const result = await env.database.prepare(`
      SELECT id, display_name, avatar_url, current_level, fitness_goal
      FROM app_user
      WHERE id != ?
        AND display_name LIKE ?
        AND onboarding_completed = 1
      LIMIT ?
    `).bind(userId, `%${query}%`, limit).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Search users error:', error)
    return errorResponse('Failed to search users', 500)
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
  const path = url.pathname.replace('/api/users', '')

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const ctx: RequestContext = { request, env, url }

  // Route matching
  if (request.method === 'PATCH' && path === '/me') {
    return handleUpdateMe(ctx)
  }

  if (path === '/me/focus-areas') {
    if (request.method === 'POST') {
      return handleSetFocusAreas(ctx)
    }
    if (request.method === 'GET') {
      return handleGetFocusAreas(ctx)
    }
  }

  if (request.method === 'GET' && path === '/me/badges') {
    return handleGetUserBadges(ctx)
  }

  if (request.method === 'GET' && path === '/search') {
    return handleSearchUsers(ctx)
  }

  return errorResponse('Not found', 404)
}

