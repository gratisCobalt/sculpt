/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Notifications API Routes

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// GET /api/notifications - Get user notifications
async function handleGetNotifications(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50'), 1), 100)
    const unreadOnly = url.searchParams.get('unread') === 'true'

    let query = `
      SELECT n.*, nt.code as type_code, nt.icon_name
      FROM notification n
      JOIN notification_type nt ON n.notification_type_id = nt.id
      WHERE n.user_id = ?
    `
    const params: unknown[] = [userId]

    if (unreadOnly) {
      query += ' AND n.is_read = 0'
    }

    query += ' ORDER BY n.created_at DESC LIMIT ?'
    params.push(limit)

    const result = await env.database.prepare(query).bind(...params).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get notifications error:', error)
    return errorResponse('Failed to get notifications', 500)
  }
}

// POST /api/notifications/read - Mark notifications as read
async function handleMarkRead(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as { notification_ids?: number[] }
    const { notification_ids } = body

    if (notification_ids && notification_ids.length > 0) {
      // Mark specific notifications as read
      for (const id of notification_ids) {
        await env.database.prepare(
          'UPDATE notification SET is_read = 1 WHERE id = ? AND user_id = ?'
        ).bind(id, userId).run()
      }
    } else {
      // Mark all as read
      await env.database.prepare(
        'UPDATE notification SET is_read = 1 WHERE user_id = ?'
      ).bind(userId).run()
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Mark notifications read error:', error)
    return errorResponse('Failed to mark notifications as read', 500)
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

  if (request.method === 'GET' && path === '/api/notifications') {
    return handleGetNotifications(ctx)
  }
  if (request.method === 'POST' && path === '/api/notifications/read') {
    return handleMarkRead(ctx)
  }

  return errorResponse('Not found', 404)
}
