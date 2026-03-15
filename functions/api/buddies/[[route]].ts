/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Buddy System API Routes
// Handles: friendships

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// GET /api/buddies - Get user's friends list
async function handleGetBuddies(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const result = await env.database.prepare(`
      SELECT 
        f.id as friendship_id,
        f.friend_streak,
        f.last_both_trained_at,
        CASE WHEN f.requester_id = ? THEN u_add.id ELSE u_req.id END as buddy_id,
        CASE WHEN f.requester_id = ? THEN u_add.display_name ELSE u_req.display_name END as buddy_name,
        CASE WHEN f.requester_id = ? THEN u_add.avatar_url ELSE u_req.avatar_url END as buddy_avatar,
        CASE WHEN f.requester_id = ? THEN u_add.current_level ELSE u_req.current_level END as buddy_level,
        CASE WHEN f.requester_id = ? THEN u_add.current_streak ELSE u_req.current_streak END as buddy_streak,
        CASE WHEN f.requester_id = ? THEN u_add.last_workout_at ELSE u_req.last_workout_at END as buddy_last_workout
      FROM friendship f
      JOIN app_user u_req ON f.requester_id = u_req.id
      JOIN app_user u_add ON f.addressee_id = u_add.id
      WHERE (f.requester_id = ? OR f.addressee_id = ?)
        AND f.status_id = 2
      ORDER BY buddy_name
    `).bind(userId, userId, userId, userId, userId, userId, userId, userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get buddies error:', error)
    return errorResponse('Failed to get buddies', 500)
  }
}

// GET /api/buddies/requests - Get pending friend requests
async function handleGetRequests(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const result = await env.database.prepare(`
      SELECT 
        f.id as friendship_id,
        u.id as user_id,
        u.display_name,
        u.avatar_url,
        u.current_level,
        f.created_at as requested_at
      FROM friendship f
      JOIN app_user u ON f.requester_id = u.id
      WHERE f.addressee_id = ? AND f.status_id = 1
      ORDER BY f.created_at DESC
    `).bind(userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get friend requests error:', error)
    return errorResponse('Failed to get friend requests', 500)
  }
}

// POST /api/buddies/request - Send friend request
async function handleSendRequest(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as { user_id: string }
    const { user_id: targetUserId } = body

    if (!targetUserId) {
      return errorResponse('user_id is required', 400)
    }

    if (targetUserId === userId) {
      return errorResponse('Cannot send friend request to yourself', 400)
    }

    // Check if friendship already exists
    const existing = await env.database.prepare(`
      SELECT * FROM friendship 
      WHERE (requester_id = ? AND addressee_id = ?)
         OR (requester_id = ? AND addressee_id = ?)
    `).bind(userId, targetUserId, targetUserId, userId).first()

    if (existing) {
      return errorResponse('Friendship already exists', 400)
    }

    const now = nowISO()
    await env.database.prepare(`
      INSERT INTO friendship (requester_id, addressee_id, status_id, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?)
    `).bind(userId, targetUserId, now, now).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Send friend request error:', error)
    return errorResponse('Failed to send friend request', 500)
  }
}

// POST /api/buddies/accept/:id - Accept friend request  
async function handleAcceptRequest(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/buddies\/accept\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)
  
  const friendshipId = parseInt(match[1])

  try {
    // Verify this request is for the current user
    const friendship = await env.database.prepare(
      'SELECT * FROM friendship WHERE id = ? AND addressee_id = ? AND status_id = 1'
    ).bind(friendshipId, userId).first()

    if (!friendship) {
      return errorResponse('Friend request not found', 404)
    }

    const now = nowISO()
    await env.database.prepare(
      'UPDATE friendship SET status_id = 2, updated_at = ? WHERE id = ?'
    ).bind(now, friendshipId).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Accept friend request error:', error)
    return errorResponse('Failed to accept friend request', 500)
  }
}

// POST /api/buddies/decline/:id - Decline friend request
async function handleDeclineRequest(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/buddies\/decline\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)
  
  const friendshipId = parseInt(match[1])

  try {
    await env.database.prepare(
      'DELETE FROM friendship WHERE id = ? AND addressee_id = ? AND status_id = 1'
    ).bind(friendshipId, userId).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Decline friend request error:', error)
    return errorResponse('Failed to decline friend request', 500)
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

  // Buddies routes
  if (request.method === 'GET' && path === '/api/buddies') {
    return handleGetBuddies(ctx)
  }
  if (request.method === 'GET' && path === '/api/buddies/requests') {
    return handleGetRequests(ctx)
  }
  if (request.method === 'POST' && path === '/api/buddies/request') {
    return handleSendRequest(ctx)
  }
  if (request.method === 'POST' && path.match(/^\/api\/buddies\/accept\/\d+$/)) {
    return handleAcceptRequest(ctx)
  }
  if (request.method === 'POST' && path.match(/^\/api\/buddies\/decline\/\d+$/)) {
    return handleDeclineRequest(ctx)
  }

  return errorResponse('Not found', 404)
}
