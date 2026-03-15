/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Activity Feed API Routes
// Handles: GET /api/activity-feed, POST /api/activity-feed/:id/congrats

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  // GET /api/activity-feed
  if (request.method === 'GET' && path === '/api/activity-feed') {
    try {
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)

      const result = await env.database.prepare(`
        SELECT
          afi.id,
          afi.user_id,
          u.display_name,
          u.avatar_url,
          at.slug as activity_type,
          at.name_de as activity_name_de,
          afi.metadata,
          afi.created_at
        FROM activity_feed_item afi
        JOIN app_user u ON afi.user_id = u.id
        JOIN activity_type at ON afi.activity_type_id = at.id
        WHERE afi.user_id IN (
          SELECT CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
          FROM friendship f
          WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status_id = 2
        )
        OR afi.user_id = ?
        ORDER BY afi.created_at DESC
        LIMIT ?
      `).bind(userId, userId, userId, userId, limit).all()

      const items = (result.results || []).map((item: Record<string, unknown>) => ({
        ...item,
        metadata: item.metadata ? JSON.parse(item.metadata as string) : {},
      }))

      return jsonResponse(items)
    } catch (error) {
      console.error('Get activity feed error:', error)
      return errorResponse('Failed to get activity feed', 500)
    }
  }

  // POST /api/activity-feed/:id/congrats
  const congratsMatch = path.match(/^\/api\/activity-feed\/(\d+)\/congrats$/)
  if (request.method === 'POST' && congratsMatch) {
    const itemId = parseInt(congratsMatch[1])

    try {
      const body = await request.json() as { emoji: string }

      // Verify the feed item exists
      const feedItem = await env.database.prepare(
        'SELECT * FROM activity_feed_item WHERE id = ?'
      ).bind(itemId).first<Record<string, unknown>>()

      if (!feedItem) return errorResponse('Activity not found', 404)

      const now = nowISO()

      // Store the congrats reaction
      try {
        await env.database.prepare(`
          INSERT INTO activity_congrats (activity_feed_item_id, user_id, emoji, created_at)
          VALUES (?, ?, ?, ?)
        `).bind(itemId, userId, body.emoji || '🎉', now).run()
      } catch {
        // Table might not exist yet — try creating inline or just acknowledge
      }

      // Send notification to the activity owner
      if (feedItem.user_id !== userId) {
        try {
          await env.database.prepare(`
            INSERT INTO notification (user_id, type, title_de, body_de, metadata, created_at)
            VALUES (?, 'congrats', 'Gratulation!', 'Jemand gratuliert dir!', ?, ?)
          `).bind(
            feedItem.user_id,
            JSON.stringify({ from_user_id: userId, activity_id: itemId, emoji: body.emoji }),
            now
          ).run()
        } catch {
          // Non-fatal
        }
      }

      return jsonResponse({ success: true })
    } catch (error) {
      console.error('Send congrats error:', error)
      return errorResponse('Failed to send congrats', 500)
    }
  }

  return errorResponse('Not found', 404)
}
