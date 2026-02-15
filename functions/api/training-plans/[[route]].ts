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
        (SELECT COUNT(*) FROM training_plan_day WHERE training_plan_id = tp.id) as total_days
      FROM training_plan tp
      WHERE tp.is_system_plan = 1
      ORDER BY tp.name
    `).all()

    // Get exercise count for each plan
    const plans = []
    for (const plan of (result.results || []) as Record<string, unknown>[]) {
      const exerciseCount = await env.database.prepare(`
        SELECT COUNT(*) as count 
        FROM training_plan_exercise tpe
        JOIN training_plan_day tpd ON tpe.training_plan_day_id = tpd.id
        WHERE tpd.training_plan_id = ?
      `).bind(plan.id).first<{ count: number }>()

      plans.push({
        ...plan,
        total_exercises: exerciseCount?.count || 0,
      })
    }

    return jsonResponse(plans)
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

// Main request handler
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const ctx: RequestContext = { request, env, url }

  if (request.method === 'GET' && path === '/api/training-plans') {
    return handleListPlans(ctx)
  }

  if (request.method === 'GET' && path.match(/^\/api\/training-plans\/\d+$/)) {
    return handleGetPlan(ctx)
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
