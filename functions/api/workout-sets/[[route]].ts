/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Workout Set API Routes
// Handles: PATCH /api/workout-sets/:id, DELETE /api/workout-sets/:id

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  // Extract set ID from path: /api/workout-sets/:id
  const match = path.match(/^\/api\/workout-sets\/(\d+)$/)
  if (!match) return errorResponse('Not found', 404)

  const setId = parseInt(match[1])

  // Verify the set belongs to the user
  const set = await env.database.prepare(`
    SELECT ws.id FROM workout_set ws
    JOIN workout_session wse ON ws.workout_session_id = wse.id
    WHERE ws.id = ? AND wse.user_id = ?
  `).bind(setId, userId).first()

  if (!set) return errorResponse('Not found', 404)

  // PATCH /api/workout-sets/:id — update weight/reps
  if (request.method === 'PATCH') {
    try {
      const body = await request.json() as { weight_kg?: number; reps?: number }
      const updates: string[] = []
      const values: unknown[] = []

      if (body.weight_kg !== undefined) {
        updates.push('weight_kg = ?')
        values.push(body.weight_kg)
      }
      if (body.reps !== undefined) {
        updates.push('reps = ?')
        values.push(body.reps)
      }

      if (updates.length === 0) return errorResponse('No fields to update', 400)

      values.push(setId)
      await env.database.prepare(
        `UPDATE workout_set SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...values).run()

      return jsonResponse({ success: true })
    } catch (error) {
      console.error('Update workout set error:', error)
      return errorResponse('Failed to update workout set', 500)
    }
  }

  // DELETE /api/workout-sets/:id
  if (request.method === 'DELETE') {
    try {
      await env.database.prepare('DELETE FROM workout_set WHERE id = ?').bind(setId).run()
      return jsonResponse({ success: true })
    } catch (error) {
      console.error('Delete workout set error:', error)
      return errorResponse('Failed to delete workout set', 500)
    }
  }

  return errorResponse('Method not allowed', 405)
}
