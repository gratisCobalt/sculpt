/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../lib/db'
import { getUserIdFromRequest } from '../lib/auth'

// Push Token API Routes
// Handles: POST /api/push-tokens, DELETE /api/push-tokens

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  // POST /api/push-tokens - Register push token
  if (request.method === 'POST') {
    try {
      const body = await request.json() as {
        token: string
        platform: string
        subscription?: { endpoint: string; keys: { p256dh: string; auth: string } }
      }

      if (!body.token) return errorResponse('Token is required', 400)

      const now = nowISO()

      await env.database.prepare(`
        INSERT INTO push_token (user_id, token, platform, created_at, last_used_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, token) DO UPDATE SET last_used_at = ?, platform = ?
      `).bind(
        userId,
        body.token,
        body.platform || 'web',
        now, now,
        now,
        body.platform || 'web'
      ).run()

      // Store web push subscription details if provided
      if (body.subscription) {
        try {
          await env.database.prepare(`
            UPDATE push_token SET metadata = ? WHERE user_id = ? AND token = ?
          `).bind(JSON.stringify(body.subscription), userId, body.token).run()
        } catch {
          // metadata column may not exist — non-fatal
        }
      }

      return jsonResponse({ success: true })
    } catch (error) {
      console.error('Register push token error:', error)
      return errorResponse('Failed to register push token', 500)
    }
  }

  // DELETE /api/push-tokens - Unregister push token
  if (request.method === 'DELETE') {
    try {
      const body = await request.json() as { token: string }

      if (!body.token) return errorResponse('Token is required', 400)

      await env.database.prepare(
        'DELETE FROM push_token WHERE user_id = ? AND token = ?'
      ).bind(userId, body.token).run()

      return jsonResponse({ success: true })
    } catch (error) {
      console.error('Unregister push token error:', error)
      return errorResponse('Failed to unregister push token', 500)
    }
  }

  return errorResponse('Method not allowed', 405)
}
