/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, startOfWeek } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// GET /api/stats/weekly - Get weekly stats for dashboard
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const weekStart = startOfWeek()

    // Get workout stats for this week
    const stats = await env.database.prepare(`
      SELECT 
        COUNT(DISTINCT ws.id) as workouts_count,
        COALESCE(SUM(ws.total_volume_kg), 0) as total_volume_kg,
        COALESCE(SUM(ws.calories_burned), 0) as calories_burned,
        COUNT(DISTINCT wset.exercise_id) as exercises_completed
      FROM workout_session ws
      LEFT JOIN workout_set wset ON ws.id = wset.workout_session_id
      WHERE ws.user_id = ? AND ws.started_at >= ?
    `).bind(userId, weekStart).first<{
      workouts_count: number
      total_volume_kg: number
      calories_burned: number
      exercises_completed: number
    }>()

    // Get current streak
    const user = await env.database.prepare(
      'SELECT current_streak FROM app_user WHERE id = ?'
    ).bind(userId).first<{ current_streak: number }>()

    return jsonResponse({
      exercises_completed: stats?.exercises_completed || 0,
      total_volume_kg: stats?.total_volume_kg || 0,
      workouts_count: stats?.workouts_count || 0,
      calories_burned: stats?.calories_burned || 0,
      streak: user?.current_streak || 0
    })
  } catch (error) {
    console.error('Get weekly stats error:', error)
    return errorResponse('Failed to get weekly stats', 500)
  }
}
