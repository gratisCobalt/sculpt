/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../lib/db'
import { getUserIdFromRequest } from '../lib/auth'

// GET /api/activity-feed - Get activity feed from buddies
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

  const url = new URL(request.url)

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

    // Parse metadata JSON for each item
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
