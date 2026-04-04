/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Training Plan API Routes
// Handles: GET /api/training-plans, GET /api/training-plans/:id, 
//          GET /api/users/me/training-plan, POST /api/users/me/training-plan

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// GET /api/training-plans - List all system training plans
async function handleListPlans(ctx: RequestContext): Promise<Response> {
  const { env } = ctx

  try {
    const result = await env.database.prepare(`
      SELECT tp.*,
        (SELECT COUNT(*) FROM training_plan_day WHERE training_plan_id = tp.id) as total_days,
        (SELECT COUNT(*) FROM training_plan_exercise tpe
         JOIN training_plan_day tpd ON tpe.training_plan_day_id = tpd.id
         WHERE tpd.training_plan_id = tp.id) as total_exercises
      FROM training_plan tp
      WHERE tp.is_system_plan = 1
      ORDER BY tp.name
    `).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('List training plans error:', error)
    return errorResponse('Failed to list training plans', 500)
  }
}

// GET /api/training-plans/:id - Get training plan details
async function handleGetPlan(ctx: RequestContext): Promise<Response> {
  const { env, url } = ctx

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)
  
  const planId = parseInt(match[1])

  try {
    const plan = await env.database.prepare(
      'SELECT * FROM training_plan WHERE id = ?'
    ).bind(planId).first()

    if (!plan) {
      return errorResponse('Training plan not found', 404)
    }

    // Get days with exercises
    const days = await env.database.prepare(`
      SELECT * FROM training_plan_day
      WHERE training_plan_id = ?
      ORDER BY day_number
    `).bind(planId).all()

    const daysWithExercises = []
    for (const day of (days.results || []) as Record<string, unknown>[]) {
      const exercises = await env.database.prepare(`
        SELECT tpe.*, e.name, e.name_de, e.image_url, e.video_url
        FROM training_plan_exercise tpe
        JOIN exercise e ON tpe.exercise_id = e.id
        WHERE tpe.training_plan_day_id = ?
        ORDER BY tpe.order_index
      `).bind(day.id).all()

      daysWithExercises.push({
        ...day,
        exercises: (exercises.results || []).map((tpe: Record<string, unknown>) => ({
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
        })),
      })
    }

    return jsonResponse({
      ...plan,
      days: daysWithExercises,
    })
  } catch (error) {
    console.error('Get training plan error:', error)
    return errorResponse('Failed to get training plan', 500)
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

    // Get current day details
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

    // Verify plan exists
    const plan = await env.database.prepare(
      'SELECT * FROM training_plan WHERE id = ?'
    ).bind(training_plan_id).first()

    if (!plan) {
      return errorResponse('Training plan not found', 404)
    }

    const now = nowISO()

    // Deactivate existing plans
    await env.database.prepare(
      'UPDATE user_training_plan SET is_active = 0 WHERE user_id = ?'
    ).bind(userId).run()

    // Create or update user training plan
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

// Helper: verify plan ownership
async function verifyPlanOwnership(env: Env, userId: string, planId: number): Promise<boolean> {
  // Check user_training_plan (any status, not just active)
  const linked = await env.database.prepare(
    'SELECT 1 FROM user_training_plan WHERE user_id = ? AND training_plan_id = ?'
  ).bind(userId, planId).first()
  if (linked) return true

  // Fallback: check if user created the plan
  const created = await env.database.prepare(
    'SELECT 1 FROM training_plan WHERE id = ? AND created_by_id = ?'
  ).bind(planId, userId).first()
  return !!created
}

// PATCH /api/training-plans/:planId/exercises/:exerciseId
async function handleUpdatePlanExercise(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)\/exercises\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const planId = parseInt(match[1])
  const exerciseId = parseInt(match[2])

  if (!(await verifyPlanOwnership(env, userId, planId))) {
    return errorResponse('Not found', 404)
  }

  try {
    const body = await request.json() as { sets?: number; min_reps?: number; max_reps?: number; rest_seconds?: number }

    // Verify the exercise belongs to this plan
    const exercise = await env.database.prepare(`
      SELECT tpe.id FROM training_plan_exercise tpe
      JOIN training_plan_day tpd ON tpe.training_plan_day_id = tpd.id
      WHERE tpe.id = ? AND tpd.training_plan_id = ?
    `).bind(exerciseId, planId).first()

    if (!exercise) return errorResponse('Exercise not found in plan', 404)

    const updates: string[] = []
    const values: (number | null)[] = []

    if (body.sets !== undefined) { updates.push('sets = ?'); values.push(body.sets) }
    if (body.min_reps !== undefined) { updates.push('min_reps = ?'); values.push(body.min_reps) }
    if (body.max_reps !== undefined) { updates.push('max_reps = ?'); values.push(body.max_reps) }
    if (body.rest_seconds !== undefined) { updates.push('rest_seconds = ?'); values.push(body.rest_seconds) }

    if (updates.length === 0) return errorResponse('No fields to update', 400)

    values.push(exerciseId)
    await env.database.prepare(
      `UPDATE training_plan_exercise SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Update plan exercise error:', error)
    return errorResponse('Failed to update exercise', 500)
  }
}

// DELETE /api/training-plans/:planId/exercises/:exerciseId
async function handleDeletePlanExercise(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)\/exercises\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const planId = parseInt(match[1])
  const exerciseId = parseInt(match[2])

  if (!(await verifyPlanOwnership(env, userId, planId))) {
    return errorResponse('Not found', 404)
  }

  try {
    const exercise = await env.database.prepare(`
      SELECT tpe.id FROM training_plan_exercise tpe
      JOIN training_plan_day tpd ON tpe.training_plan_day_id = tpd.id
      WHERE tpe.id = ? AND tpd.training_plan_id = ?
    `).bind(exerciseId, planId).first()

    if (!exercise) return errorResponse('Exercise not found in plan', 404)

    await env.database.prepare(
      'DELETE FROM training_plan_exercise WHERE id = ?'
    ).bind(exerciseId).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Delete plan exercise error:', error)
    return errorResponse('Failed to delete exercise', 500)
  }
}

// POST /api/training-plans/:planId/days/:dayId/exercises
async function handleAddPlanExercise(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)\/days\/(\d+)\/exercises$/)
  if (!match) return errorResponse('Invalid path', 400)

  const planId = parseInt(match[1])
  const dayId = parseInt(match[2])

  if (!(await verifyPlanOwnership(env, userId, planId))) {
    return errorResponse('Not found', 404)
  }

  try {
    // Verify day belongs to plan
    const day = await env.database.prepare(
      'SELECT id FROM training_plan_day WHERE id = ? AND training_plan_id = ?'
    ).bind(dayId, planId).first()

    if (!day) return errorResponse('Day not found in plan', 404)

    const body = await request.json() as { exercise_id: number; sets?: number; min_reps?: number; max_reps?: number }
    if (!body.exercise_id) return errorResponse('exercise_id is required', 400)

    // Get max order_index
    const maxOrder = await env.database.prepare(
      'SELECT COALESCE(MAX(order_index), 0) as max_idx FROM training_plan_exercise WHERE training_plan_day_id = ?'
    ).bind(dayId).first() as { max_idx: number } | null

    const nextOrder = (maxOrder?.max_idx || 0) + 1

    const result = await env.database.prepare(`
      INSERT INTO training_plan_exercise (training_plan_day_id, exercise_id, order_index, sets, min_reps, max_reps)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      dayId,
      body.exercise_id,
      nextOrder,
      body.sets || 3,
      body.min_reps || 8,
      body.max_reps || 12
    ).run()

    return jsonResponse({ success: true, id: result.meta?.last_row_id })
  } catch (error) {
    console.error('Add plan exercise error:', error)
    return errorResponse('Failed to add exercise', 500)
  }
}

// PUT /api/training-plans/:planId/days/:dayId/exercises/reorder
async function handleReorderPlanExercises(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)\/days\/(\d+)\/exercises\/reorder$/)
  if (!match) return errorResponse('Invalid path', 400)

  const planId = parseInt(match[1])
  const dayId = parseInt(match[2])

  if (!(await verifyPlanOwnership(env, userId, planId))) {
    return errorResponse('Not found', 404)
  }

  try {
    // Verify day belongs to plan
    const day = await env.database.prepare(
      'SELECT id FROM training_plan_day WHERE id = ? AND training_plan_id = ?'
    ).bind(dayId, planId).first()

    if (!day) return errorResponse('Day not found in plan', 404)

    const body = await request.json() as { exercise_ids: number[] }
    if (!body.exercise_ids || !Array.isArray(body.exercise_ids)) {
      return errorResponse('exercise_ids array is required', 400)
    }

    // Clear order_index first to avoid UNIQUE(training_plan_day_id, order_index) violations
    const clearStmts = body.exercise_ids.map((id, i) =>
      env.database.prepare(
        'UPDATE training_plan_exercise SET order_index = ? WHERE id = ? AND training_plan_day_id = ?'
      ).bind(-(i + 1), id, dayId)
    )
    const setStmts = body.exercise_ids.map((id, i) =>
      env.database.prepare(
        'UPDATE training_plan_exercise SET order_index = ? WHERE id = ? AND training_plan_day_id = ?'
      ).bind(i + 1, id, dayId)
    )
    await env.database.batch([...clearStmts, ...setStmts])

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Reorder plan exercises error:', error)
    return errorResponse('Failed to reorder exercises', 500)
  }
}

// PATCH /api/training-plans/:planId/days/:dayId - Update day name
async function handleUpdateDay(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)\/days\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const [, planId, dayId] = match

  try {
    const body = await request.json() as { name?: string; name_de?: string }

    // Verify ownership
    const plan = await env.database.prepare(
      'SELECT id FROM training_plan WHERE id = ? AND created_by_id = ?'
    ).bind(planId, userId).first()
    if (!plan) return errorResponse('Plan not found', 404)

    const day = await env.database.prepare(
      'SELECT id FROM training_plan_day WHERE id = ? AND training_plan_id = ?'
    ).bind(dayId, planId).first()
    if (!day) return errorResponse('Day not found', 404)

    await env.database.prepare(
      'UPDATE training_plan_day SET name = ?, name_de = ? WHERE id = ?'
    ).bind(body.name || null, body.name_de || body.name || null, dayId).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Update day error:', error)
    return errorResponse('Failed to update day', 500)
  }
}

// POST /api/training-plans/:planId/days - Add a new day
async function handleAddDay(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)\/days$/)
  if (!match) return errorResponse('Invalid path', 400)

  const planId = match[1]

  try {
    const body = await request.json() as { name: string; name_de?: string }
    if (!body.name) return errorResponse('name is required', 400)

    // Verify ownership
    const plan = await env.database.prepare(
      'SELECT id FROM training_plan WHERE id = ? AND created_by_id = ?'
    ).bind(planId, userId).first()
    if (!plan) return errorResponse('Plan not found', 404)

    // Get next day_number
    const maxDay = await env.database.prepare(
      'SELECT COALESCE(MAX(day_number), 0) as max_num FROM training_plan_day WHERE training_plan_id = ?'
    ).bind(planId).first<{ max_num: number }>()

    const dayNumber = (maxDay?.max_num || 0) + 1

    const result = await env.database.prepare(
      'INSERT INTO training_plan_day (training_plan_id, day_number, name, name_de) VALUES (?, ?, ?, ?)'
    ).bind(planId, dayNumber, body.name, body.name_de || body.name).run()

    return jsonResponse({ success: true, id: result.meta.last_row_id, day_number: dayNumber })
  } catch (error) {
    console.error('Add day error:', error)
    return errorResponse('Failed to add day', 500)
  }
}

// DELETE /api/training-plans/:planId/days/:dayId - Delete a day
async function handleDeleteDay(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)\/days\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const [, planId, dayId] = match

  try {
    // Verify ownership
    const plan = await env.database.prepare(
      'SELECT id FROM training_plan WHERE id = ? AND created_by_id = ?'
    ).bind(planId, userId).first()
    if (!plan) return errorResponse('Plan not found', 404)

    // Delete exercises first, then the day
    await env.database.prepare(
      'DELETE FROM training_plan_exercise WHERE training_plan_day_id = ?'
    ).bind(dayId).run()

    await env.database.prepare(
      'DELETE FROM training_plan_day WHERE id = ? AND training_plan_id = ?'
    ).bind(dayId, planId).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Delete day error:', error)
    return errorResponse('Failed to delete day', 500)
  }
}

// GET /api/training-plans/mine - List all user's training plans
async function handleListMyPlans(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const result = await env.database.prepare(`
      SELECT DISTINCT tp.id, tp.name, tp.name_de, tp.description_de, tp.days_per_week, tp.created_at,
        (SELECT COUNT(*) FROM training_plan_day WHERE training_plan_id = tp.id) as total_days,
        (SELECT COUNT(*) FROM training_plan_exercise tpe
         JOIN training_plan_day tpd ON tpe.training_plan_day_id = tpd.id
         WHERE tpd.training_plan_id = tp.id) as total_exercises,
        CASE WHEN utp.is_active = 1 THEN 1 ELSE 0 END as is_active
      FROM training_plan tp
      LEFT JOIN user_training_plan utp ON tp.id = utp.training_plan_id AND utp.user_id = ?
      WHERE tp.created_by_id = ? OR utp.user_id = ?
      ORDER BY utp.is_active DESC, tp.created_at DESC
    `).bind(userId, userId, userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('List my plans error:', error)
    return errorResponse('Failed to list plans', 500)
  }
}

// DELETE /api/training-plans/:id - Delete a training plan
async function handleDeletePlan(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const planId = parseInt(match[1])

  if (!(await verifyPlanOwnership(env, userId, planId))) {
    return errorResponse('Not found', 404)
  }

  try {
    // Delete exercises → days → user_training_plan → plan
    const days = await env.database.prepare(
      'SELECT id FROM training_plan_day WHERE training_plan_id = ?'
    ).bind(planId).all()

    for (const day of (days.results || []) as Record<string, unknown>[]) {
      await env.database.prepare(
        'DELETE FROM training_plan_exercise WHERE training_plan_day_id = ?'
      ).bind(day.id).run()
    }

    await env.database.prepare(
      'DELETE FROM training_plan_day WHERE training_plan_id = ?'
    ).bind(planId).run()

    await env.database.prepare(
      'DELETE FROM user_training_plan WHERE training_plan_id = ?'
    ).bind(planId).run()

    await env.database.prepare(
      'DELETE FROM training_plan WHERE id = ?'
    ).bind(planId).run()

    // Auto-activate the most recent remaining plan
    const nextPlan = await env.database.prepare(
      'SELECT training_plan_id FROM user_training_plan WHERE user_id = ? ORDER BY started_at DESC LIMIT 1'
    ).bind(userId).first<{ training_plan_id: number }>()

    if (nextPlan) {
      await env.database.prepare(
        'UPDATE user_training_plan SET is_active = 1 WHERE user_id = ? AND training_plan_id = ?'
      ).bind(userId, nextPlan.training_plan_id).run()
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return errorResponse('Failed to delete plan', 500)
  }
}

// PATCH /api/training-plans/:id - Rename a training plan
async function handleRenamePlan(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/training-plans\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const planId = parseInt(match[1])

  if (!(await verifyPlanOwnership(env, userId, planId))) {
    return errorResponse('Not found', 404)
  }

  try {
    const body = await request.json() as { name?: string; name_de?: string }
    if (!body.name) return errorResponse('name is required', 400)

    await env.database.prepare(
      'UPDATE training_plan SET name = ?, name_de = ?, updated_at = ? WHERE id = ?'
    ).bind(body.name, body.name_de || body.name, nowISO(), planId).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Rename plan error:', error)
    return errorResponse('Failed to rename plan', 500)
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

  // User's own plans (must come before generic /training-plans routes)
  if (request.method === 'GET' && path === '/api/training-plans/mine') {
    return handleListMyPlans(ctx)
  }

  if (request.method === 'GET' && path === '/api/training-plans') {
    return handleListPlans(ctx)
  }

  // Plan-level CRUD (rename, delete)
  if (path.match(/^\/api\/training-plans\/\d+$/) && !path.includes('days') && !path.includes('exercises')) {
    if (request.method === 'GET') return handleGetPlan(ctx)
    if (request.method === 'PATCH') return handleRenamePlan(ctx)
    if (request.method === 'DELETE') return handleDeletePlan(ctx)
  }

  // Plan exercise editing routes
  if (path.match(/^\/api\/training-plans\/\d+\/exercises\/\d+$/)) {
    if (request.method === 'PATCH') return handleUpdatePlanExercise(ctx)
    if (request.method === 'DELETE') return handleDeletePlanExercise(ctx)
  }

  // Day CRUD routes
  if (path.match(/^\/api\/training-plans\/\d+\/days\/\d+$/) && !path.includes('exercises')) {
    if (request.method === 'PATCH') return handleUpdateDay(ctx)
    if (request.method === 'DELETE') return handleDeleteDay(ctx)
  }

  if (request.method === 'POST' && path.match(/^\/api\/training-plans\/\d+\/days$/)) {
    return handleAddDay(ctx)
  }

  if (request.method === 'POST' && path.match(/^\/api\/training-plans\/\d+\/days\/\d+\/exercises$/)) {
    return handleAddPlanExercise(ctx)
  }

  if (request.method === 'PUT' && path.match(/^\/api\/training-plans\/\d+\/days\/\d+\/exercises\/reorder$/)) {
    return handleReorderPlanExercises(ctx)
  }

  // User training plan routes
  if (path === '/api/users/me/training-plan') {
    if (request.method === 'GET') {
      return handleGetUserPlan(ctx)
    }
    if (request.method === 'POST') {
      return handleSetUserPlan(ctx)
    }
  }

  return errorResponse('Not found', 404)
}
