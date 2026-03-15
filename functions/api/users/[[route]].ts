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

// GET /api/users/me/training-plan - Get user's active training plan
async function handleGetUserPlan(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const userPlan = await env.database.prepare(`
      SELECT utp.*, tp.name, tp.name_de, tp.days_per_week
      FROM user_training_plan utp
      JOIN training_plan tp ON utp.training_plan_id = tp.id
      WHERE utp.user_id = ? AND utp.is_active = 1
    `).bind(userId).first()

    if (!userPlan) {
      return jsonResponse(null)
    }

    const currentDay = await env.database.prepare(`
      SELECT * FROM training_plan_day
      WHERE training_plan_id = ? AND day_number = ?
    `).bind(
      (userPlan as Record<string, unknown>).training_plan_id,
      (userPlan as Record<string, unknown>).current_day
    ).first()

    let dayExercises: unknown[] = []
    if (currentDay) {
      const exercises = await env.database.prepare(`
        SELECT tpe.*, e.name, e.name_de, e.image_url, e.video_url
        FROM training_plan_exercise tpe
        JOIN exercise e ON tpe.exercise_id = e.id
        WHERE tpe.training_plan_day_id = ?
        ORDER BY tpe.order_index
      `).bind((currentDay as Record<string, unknown>).id).all()

      dayExercises = (exercises.results || []).map((tpe: Record<string, unknown>) => ({
        id: tpe.id,
        order_index: tpe.order_index,
        sets: tpe.sets,
        min_reps: tpe.min_reps,
        max_reps: tpe.max_reps,
        exercise: {
          id: tpe.exercise_id,
          name: tpe.name,
          name_de: tpe.name_de,
          image_url: tpe.image_url,
          video_url: tpe.video_url,
        },
      }))
    }

    return jsonResponse({
      ...userPlan,
      current_day_details: currentDay ? {
        ...currentDay,
        exercises: dayExercises,
      } : null,
    })
  } catch (error) {
    console.error('Get user training plan error:', error)
    return errorResponse('Failed to get training plan', 500)
  }
}

// POST /api/users/me/training-plan - Set user's training plan
async function handleSetUserPlan(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as { training_plan_id: number }
    const { training_plan_id } = body

    if (!training_plan_id) {
      return errorResponse('training_plan_id is required', 400)
    }

    const plan = await env.database.prepare(
      'SELECT * FROM training_plan WHERE id = ?'
    ).bind(training_plan_id).first()

    if (!plan) {
      return errorResponse('Training plan not found', 404)
    }

    const now = nowISO()

    await env.database.prepare(
      'UPDATE user_training_plan SET is_active = 0 WHERE user_id = ?'
    ).bind(userId).run()

    await env.database.prepare(`
      INSERT INTO user_training_plan (user_id, training_plan_id, current_day, started_at, is_active)
      VALUES (?, ?, 1, ?, 1)
      ON CONFLICT(user_id, training_plan_id)
      DO UPDATE SET is_active = 1, current_day = 1, started_at = ?
    `).bind(userId, training_plan_id, now, now).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Set user training plan error:', error)
    return errorResponse('Failed to set training plan', 500)
  }
}

// DELETE /api/users/me - Delete account and all associated data
async function handleDeleteAccount(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    // Clean up tables that don't CASCADE from app_user.
    // Use try/catch per statement so missing tables don't block deletion.
    const cleanup = [
      'DELETE FROM challenge WHERE challenger_id = ? OR opponent_id = ?',
      'DELETE FROM friendship WHERE requester_id = ? OR addressee_id = ?',
    ]
    for (const sql of cleanup) {
      try {
        await env.database.prepare(sql).bind(userId, userId).run()
      } catch {
        // Table may not exist — continue
      }
    }

    // Nullify training plans created by user (keep plans, remove author reference)
    try {
      await env.database.prepare(
        'UPDATE training_plan SET created_by_id = NULL WHERE created_by_id = ?'
      ).bind(userId).run()
    } catch {
      // Column may not exist
    }

    // Delete the user — CASCADE handles most related data
    await env.database.prepare(
      'DELETE FROM app_user WHERE id = ?'
    ).bind(userId).run()

    return jsonResponse({ success: true, message: 'Account and all data deleted' })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Delete account error:', detail)
    return errorResponse('Failed to delete account', 500)
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

  if (request.method === 'GET' && path === '/me/level') {
    return handleGetUserLevel(ctx)
  }

  if (request.method === 'GET' && path === '/me/badges') {
    return handleGetUserBadges(ctx)
  }

  if (request.method === 'GET' && path === '/search') {
    return handleSearchUsers(ctx)
  }

  if (request.method === 'DELETE' && path === '/me') {
    return handleDeleteAccount(ctx)
  }

  // User training plan routes (must be in users handler for Cloudflare Pages routing)
  if (path === '/me/training-plan') {
    if (request.method === 'GET') {
      return handleGetUserPlan(ctx)
    }
    if (request.method === 'POST') {
      return handleSetUserPlan(ctx)
    }
  }

  return errorResponse('Not found', 404)
}

