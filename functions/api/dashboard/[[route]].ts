/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, daysAgo, startOfWeek } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Dashboard API Routes for Cloudflare Pages Functions
// Handles: GET /api/dashboard/stats, GET /api/dashboard/exercise-progress

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// GET /api/dashboard/stats
async function handleGetStats(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const period = parseInt(url.searchParams.get('period') || '7')
    const periodStart = daysAgo(period)
    const prevPeriodStart = daysAgo(period * 2)
    const weekStart = startOfWeek()

    // Current period stats
    const currentStats = await env.database.prepare(`
      SELECT 
        COUNT(DISTINCT id) as total_workouts,
        COALESCE(SUM(total_volume_kg), 0) as total_volume,
        COALESCE(SUM(calories_burned), 0) as calories_burned
      FROM workout_session
      WHERE user_id = ? AND started_at >= ?
    `).bind(userId, periodStart).first<{
      total_workouts: number
      total_volume: number
      calories_burned: number
    }>()

    // Previous period stats
    const prevStats = await env.database.prepare(`
      SELECT 
        COUNT(DISTINCT id) as total_workouts,
        COALESCE(SUM(total_volume_kg), 0) as total_volume
      FROM workout_session
      WHERE user_id = ? AND started_at >= ? AND started_at < ?
    `).bind(userId, prevPeriodStart, periodStart).first<{
      total_workouts: number
      total_volume: number
    }>()

    // Workouts this week
    const thisWeek = await env.database.prepare(`
      SELECT COUNT(*) as count
      FROM workout_session
      WHERE user_id = ? AND started_at >= ?
    `).bind(userId, weekStart).first<{ count: number }>()

    // User data
    const user = await env.database.prepare(
      'SELECT current_streak, training_frequency_per_week FROM app_user WHERE id = ?'
    ).bind(userId).first<{
      current_streak: number
      training_frequency_per_week: number | null
    }>()

    return jsonResponse({
      totalWorkouts: currentStats?.total_workouts || 0,
      totalVolume: currentStats?.total_volume || 0,
      caloriesBurned: currentStats?.calories_burned || 0,
      currentStreak: user?.current_streak || 0,
      workoutsThisWeek: thisWeek?.count || 0,
      targetWorkoutsPerWeek: user?.training_frequency_per_week || 3,
      previousPeriodWorkouts: prevStats?.total_workouts || 0,
      previousPeriodVolume: prevStats?.total_volume || 0,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return errorResponse('Failed to get stats', 500)
  }
}

// GET /api/dashboard/exercise-progress
async function handleGetExerciseProgress(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const period = parseInt(url.searchParams.get('period') || '7')
    const bodyPart = url.searchParams.get('bodyPart')
    const periodStart = daysAgo(period)

    let query = `
      SELECT 
        e.id as exercise_id,
        e.name,
        e.name_de,
        e.image_url,
        ws.id as set_id,
        ws.weight_kg,
        ws.reps,
        ws.set_number,
        ws.is_warmup,
        ws.is_pr,
        wse.started_at as date,
        (SELECT LOWER(bp.code) FROM exercise_body_part ebp JOIN body_part bp ON ebp.body_part_id = bp.id WHERE ebp.exercise_id = e.id LIMIT 1) as primary_category
      FROM workout_set ws
      JOIN workout_session wse ON ws.workout_session_id = wse.id
      JOIN exercise e ON ws.exercise_id = e.id
      WHERE wse.user_id = ? AND wse.started_at >= ?
    `
    const params: unknown[] = [userId, periodStart]

    if (bodyPart && bodyPart !== 'all') {
      query += ` AND EXISTS (
        SELECT 1 FROM exercise_body_part ebp 
        JOIN body_part bp ON ebp.body_part_id = bp.id 
        WHERE ebp.exercise_id = e.id AND LOWER(bp.code) = LOWER(?)
      )`
      params.push(bodyPart)
    }

    query += ' ORDER BY e.id, wse.started_at, ws.set_number'

    const result = await env.database.prepare(query).bind(...params).all()

    // Group by exercise
    const exerciseMap = new Map<number, {
      exercise: { id: number; name: string; name_de: string | null; image_url: string | null; primary_category: string }
      history: { date: string; weight: number; reps: number; volume: number }[]
      allSets: unknown[]
      latestWeight: number
      latestReps: number
      maxWeight: number
      isPR: boolean
    }>()

    for (const row of (result.results || []) as Record<string, unknown>[]) {
      const exerciseId = row.exercise_id as number
      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, {
          exercise: {
            id: exerciseId,
            name: row.name as string,
            name_de: row.name_de as string | null,
            image_url: row.image_url as string | null,
            primary_category: (row.primary_category as string) || 'other',
          },
          history: [],
          allSets: [],
          latestWeight: 0,
          latestReps: 0,
          maxWeight: 0,
          isPR: false,
        })
      }

      const data = exerciseMap.get(exerciseId)!
      const weight = parseFloat(row.weight_kg as string)
      const reps = row.reps as number

      data.history.push({
        date: row.date as string,
        weight,
        reps,
        volume: weight * reps,
      })

      data.allSets.push({
        id: row.set_id,
        date: row.date,
        weight,
        reps,
        setNumber: row.set_number,
        isWarmup: row.is_warmup,
        isPR: row.is_pr,
      })

      if (weight > data.maxWeight) {
        data.maxWeight = weight
      }
    }

    // Set latest values
    exerciseMap.forEach((data) => {
      if (data.history.length > 0) {
        const latest = data.history[data.history.length - 1]
        data.latestWeight = latest.weight
        data.latestReps = latest.reps
        data.isPR = latest.weight === data.maxWeight && data.history.length > 1
      }
    })

    // Sort by latest workout date descending
    const exercises = Array.from(exerciseMap.values()).sort((a, b) => {
      const dateA = a.history[a.history.length - 1]?.date || ''
      const dateB = b.history[b.history.length - 1]?.date || ''
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    return jsonResponse(exercises)
  } catch (error) {
    console.error('Exercise progress error:', error)
    return errorResponse('Failed to get exercise progress', 500)
  }
}

// Main request handler
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/dashboard', '')

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const ctx: RequestContext = { request, env, url }

  if (request.method === 'GET' && path === '/stats') {
    return handleGetStats(ctx)
  }

  if (request.method === 'GET' && path === '/exercise-progress') {
    return handleGetExerciseProgress(ctx)
  }

  return errorResponse('Not found', 404)
}
