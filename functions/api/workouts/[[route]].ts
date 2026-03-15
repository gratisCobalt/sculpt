/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Workout API Routes for Cloudflare Pages Functions
// Handles: POST /api/workouts, GET /api/workouts, GET /api/workouts/:id

interface WorkoutSet {
  exercise_id: number
  set_number: number
  weight_kg: number
  reps: number
  is_warmup?: boolean
  rpe?: number
}

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// POST /api/workouts - Create new workout
async function handleCreateWorkout(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as { 
      training_plan_day_id?: number
      sets: WorkoutSet[]
    }
    const { training_plan_day_id, sets } = body

    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      return errorResponse('Sets are required', 400)
    }

    const now = nowISO()
    
    // Create workout session
    const sessionResult = await env.database.prepare(`
      INSERT INTO workout_session (user_id, training_plan_day_id, started_at)
      VALUES (?, ?, ?)
      RETURNING *
    `).bind(userId, training_plan_day_id || null, now).first()

    if (!sessionResult) {
      return errorResponse('Failed to create workout session', 500)
    }

    const sessionId = (sessionResult as Record<string, unknown>).id as number
    let totalVolume = 0
    let totalCalories = 0

    // Insert sets
    for (const set of sets) {
      await env.database.prepare(`
        INSERT INTO workout_set (workout_session_id, exercise_id, set_number, weight_kg, reps, is_warmup, rpe, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        set.exercise_id,
        set.set_number,
        set.weight_kg,
        set.reps,
        set.is_warmup ? 1 : 0,
        set.rpe || null,
        now
      ).run()

      if (!set.is_warmup) {
        totalVolume += set.weight_kg * set.reps

        // Calculate calories based on MET value
        const exercise = await env.database.prepare(
          'SELECT met_value FROM exercise WHERE id = ?'
        ).bind(set.exercise_id).first<{ met_value: number }>()
        
        const met = exercise?.met_value || 5
        // Rough estimate: MET * weight(kg) * duration(hours)
        totalCalories += (met * 80 * 0.5) / 60
      }
    }

    // Calculate duration
    const completedAt = nowISO()
    const startTime = new Date(now).getTime()
    const endTime = new Date(completedAt).getTime()
    const durationSeconds = Math.round((endTime - startTime) / 1000)

    // Update session with totals
    await env.database.prepare(`
      UPDATE workout_session 
      SET completed_at = ?,
          duration_seconds = ?,
          total_volume_kg = ?,
          calories_burned = ?
      WHERE id = ?
    `).bind(completedAt, durationSeconds, totalVolume, Math.round(totalCalories), sessionId).run()

    // Update user's last workout and streak
    await env.database.prepare(`
      UPDATE app_user 
      SET last_workout_at = ?,
          current_streak = CASE 
            WHEN last_workout_at >= datetime('now', '-7 days') THEN current_streak + 1
            ELSE 1
          END,
          longest_streak = MAX(longest_streak, 
            CASE WHEN last_workout_at >= datetime('now', '-7 days') THEN current_streak + 1 ELSE 1 END
          ),
          updated_at = ?
      WHERE id = ?
    `).bind(completedAt, completedAt, userId).run()

    // Create activity feed item for buddies
    try {
      const activityType = await env.database.prepare(
        "SELECT id FROM activity_type WHERE slug = 'workout_completed'"
      ).first<{ id: number }>()

      if (activityType) {
        await env.database.prepare(`
          INSERT INTO activity_feed_item (user_id, activity_type_id, metadata, created_at)
          VALUES (?, ?, ?, ?)
        `).bind(
          userId,
          activityType.id,
          JSON.stringify({
            session_id: sessionId,
            total_volume: totalVolume,
            set_count: sets.length,
          }),
          now
        ).run()
      }
    } catch (bragErr) {
      console.error('Auto-brag error (non-fatal):', bragErr)
    }

    // Get the updated session
    const session = await env.database.prepare(
      'SELECT * FROM workout_session WHERE id = ?'
    ).bind(sessionId).first()

    return jsonResponse(session)
  } catch (error) {
    console.error('Create workout error:', error)
    return errorResponse('Failed to create workout', 500)
  }
}

// GET /api/workouts - List user's workouts
async function handleListWorkouts(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)

    const sessions = await env.database.prepare(`
      SELECT * FROM workout_session
      WHERE user_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `).bind(userId, limit).all()

    // Get sets for each session
    const workouts = []
    for (const session of (sessions.results || []) as Record<string, unknown>[]) {
      const sets = await env.database.prepare(`
        SELECT ws.*, e.name as exercise_name, e.name_de as exercise_name_de
        FROM workout_set ws
        JOIN exercise e ON ws.exercise_id = e.id
        WHERE ws.workout_session_id = ?
        ORDER BY ws.exercise_id, ws.set_number
      `).bind(session.id).all()

      workouts.push({
        ...session,
        sets: sets.results || [],
      })
    }

    return jsonResponse(workouts)
  } catch (error) {
    console.error('List workouts error:', error)
    return errorResponse('Failed to list workouts', 500)
  }
}

// GET /api/exercises/:id/last-workout - Get last workout for an exercise
async function handleGetLastWorkout(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  // Extract exercise ID from path
  const match = url.pathname.match(/\/api\/exercises\/(\d+)\/last-workout/)
  if (!match) return errorResponse('Invalid path', 400)
  
  const exerciseId = parseInt(match[1])

  try {
    // Get the last workout session that had this exercise
    const lastSession = await env.database.prepare(`
      SELECT wse.started_at
      FROM workout_session wse
      JOIN workout_set ws ON wse.id = ws.workout_session_id
      WHERE wse.user_id = ? AND ws.exercise_id = ?
      ORDER BY wse.started_at DESC
      LIMIT 1
    `).bind(userId, exerciseId).first<{ started_at: string }>()

    if (!lastSession) {
      return jsonResponse({ lastWorkoutDate: null, sets: {} })
    }

    // Get all sets from that workout for this exercise
    const result = await env.database.prepare(`
      SELECT ws.set_number, ws.weight_kg, ws.reps, ws.is_warmup
      FROM workout_set ws
      JOIN workout_session wse ON ws.workout_session_id = wse.id
      WHERE wse.user_id = ? AND ws.exercise_id = ? AND wse.started_at = ?
      ORDER BY ws.set_number
    `).bind(userId, exerciseId, lastSession.started_at).all()

    const setsByNumber: Record<number, { weight: number; reps: number; isWarmup: boolean }> = {}
    for (const row of (result.results || []) as Record<string, unknown>[]) {
      setsByNumber[row.set_number as number] = {
        weight: parseFloat(row.weight_kg as string),
        reps: row.reps as number,
        isWarmup: Boolean(row.is_warmup),
      }
    }

    return jsonResponse({
      lastWorkoutDate: lastSession.started_at,
      sets: setsByNumber,
    })
  } catch (error) {
    console.error('Get last workout error:', error)
    return errorResponse('Failed to get last workout', 500)
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

  if (path === '/api/workouts') {
    if (request.method === 'POST') {
      return handleCreateWorkout(ctx)
    }
    if (request.method === 'GET') {
      return handleListWorkouts(ctx)
    }
  }

  // Handle /api/exercises/:id/last-workout
  if (request.method === 'GET' && path.match(/^\/api\/exercises\/\d+\/last-workout$/)) {
    return handleGetLastWorkout(ctx)
  }

  return errorResponse('Not found', 404)
}
