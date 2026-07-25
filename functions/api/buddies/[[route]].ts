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

// GET /api/buddies - Get all of the user's buddy connections.
// Keep this response shape aligned with the frontend's BuddyConnection type.
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
        fs.code as status,
        CASE WHEN f.requester_id = ? THEN 'sent' ELSE 'received' END as direction,
        CASE WHEN f.requester_id = ? THEN u_add.id ELSE u_req.id END as id,
        CASE WHEN f.requester_id = ? THEN u_add.display_name ELSE u_req.display_name END as display_name,
        CASE WHEN f.requester_id = ? THEN u_add.avatar_url ELSE u_req.avatar_url END as avatar_url,
        CASE WHEN f.requester_id = ? THEN u_add.current_level ELSE u_req.current_level END as current_level,
        CASE WHEN f.requester_id = ? THEN u_add.current_streak ELSE u_req.current_streak END as current_streak,
        CASE WHEN f.requester_id = ? THEN u_add.fitness_goal ELSE u_req.fitness_goal END as fitness_goal,
        CASE WHEN f.requester_id = ? THEN u_add.last_workout_at ELSE u_req.last_workout_at END as last_workout_at,
        f.created_at
      FROM friendship f
      JOIN friendship_status fs ON f.status_id = fs.id
      JOIN app_user u_req ON f.requester_id = u_req.id
      JOIN app_user u_add ON f.addressee_id = u_add.id
      WHERE (f.requester_id = ? OR f.addressee_id = ?)
        AND fs.code IN ('pending', 'accepted')
      ORDER BY CASE fs.code WHEN 'pending' THEN 0 ELSE 1 END, display_name COLLATE NOCASE
    `).bind(userId, userId, userId, userId, userId, userId, userId, userId, userId, userId).all()

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
    const body = await request.json().catch(() => null) as { user_id?: unknown } | null
    if (!body || typeof body.user_id !== 'string') {
      return errorResponse('user_id is required', 400)
    }
    const { user_id: targetUserId } = body

    if (!targetUserId.trim()) {
      return errorResponse('user_id is required', 400)
    }

    if (targetUserId === userId) {
      return errorResponse('Cannot send friend request to yourself', 400)
    }

    const now = nowISO()
    const result = await env.database.prepare(`
      INSERT INTO friendship (requester_id, addressee_id, status_id, created_at, updated_at)
      SELECT ?, ?, 1, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM app_user WHERE id = ? AND onboarding_completed = 1
      ) AND NOT EXISTS (
        SELECT 1 FROM friendship
        WHERE (requester_id = ? AND addressee_id = ?)
           OR (requester_id = ? AND addressee_id = ?)
      )
    `).bind(
      userId, targetUserId, now, now,
      targetUserId,
      userId, targetUserId, targetUserId, userId
    ).run()

    if (!result.meta.changes) {
      const target = await env.database.prepare(
        'SELECT id FROM app_user WHERE id = ? AND onboarding_completed = 1'
      ).bind(targetUserId).first()
      return target
        ? errorResponse('Friendship already exists', 409)
        : errorResponse('User not found', 404)
    }

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

// PATCH /api/buddies/:id - Respond to friend request (accept/reject)
async function handleRespondToRequest(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/buddies\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const friendshipId = parseInt(match[1])

  try {
    const body = await request.json() as { action: string }
    const { action } = body

    if (action === 'accept') {
      const friendship = await env.database.prepare(
        'SELECT * FROM friendship WHERE id = ? AND addressee_id = ? AND status_id = 1'
      ).bind(friendshipId, userId).first()

      if (!friendship) return errorResponse('Friend request not found', 404)

      const now = nowISO()
      await env.database.prepare(
        'UPDATE friendship SET status_id = 2, updated_at = ? WHERE id = ?'
      ).bind(now, friendshipId).run()

      return jsonResponse({ success: true, status: 'accepted' })
    } else if (action === 'reject') {
      const result = await env.database.prepare(
        'DELETE FROM friendship WHERE id = ? AND addressee_id = ? AND status_id = 1'
      ).bind(friendshipId, userId).run()

      if (!result.meta.changes) return errorResponse('Friend request not found', 404)

      return jsonResponse({ success: true, status: 'rejected' })
    }

    return errorResponse('Invalid action — use "accept" or "reject"', 400)
  } catch (error) {
    console.error('Respond to friend request error:', error)
    return errorResponse('Failed to respond to friend request', 500)
  }
}

// DELETE /api/buddies/:id - Remove buddy
async function handleRemoveBuddy(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/buddies\/(\d+)$/)
  if (!match) return errorResponse('Invalid path', 400)

  const friendshipId = parseInt(match[1])

  try {
    const result = await env.database.prepare(
      'DELETE FROM friendship WHERE id = ? AND (requester_id = ? OR addressee_id = ?)'
    ).bind(friendshipId, userId, userId).run()

    if (!result.meta.changes) return errorResponse('Buddy connection not found', 404)

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Remove buddy error:', error)
    return errorResponse('Failed to remove buddy', 500)
  }
}

// POST /api/buddies/:id/remind - Send training reminder
async function handleSendReminder(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/buddies\/(\d+)\/remind$/)
  if (!match) return errorResponse('Invalid path', 400)

  const friendshipId = parseInt(match[1])

  try {
    // Verify friendship exists and user is part of it
    const friendship = await env.database.prepare(
      'SELECT * FROM friendship WHERE id = ? AND (requester_id = ? OR addressee_id = ?) AND status_id = 2'
    ).bind(friendshipId, userId, userId).first<Record<string, unknown>>()

    if (!friendship) return errorResponse('Friendship not found', 404)

    // Determine buddy's user ID
    const buddyId = friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id

    const recentlySent = await env.database.prepare(`
      SELECT n.id
      FROM notification n
      JOIN notification_type nt ON nt.id = n.notification_type_id
      WHERE n.user_id = ? AND n.sender_id = ? AND nt.code = 'buddy_reminder'
        AND datetime(n.created_at) >= datetime('now', '-6 hours')
      LIMIT 1
    `).bind(buddyId, userId).first()

    if (recentlySent) {
      return errorResponse('Reminder already sent recently', 429)
    }

    // Create a notification using the schema from the buddy migration.
    const now = nowISO()
    const notification = await env.database.prepare(`
      INSERT INTO notification (
        user_id, notification_type_id, sender_id, title, body, data, created_at
      )
      SELECT ?, id, ?, 'Trainings-Erinnerung', 'Dein Buddy wartet auf dich!', ?, ?
      FROM notification_type
      WHERE code = 'buddy_reminder'
    `).bind(
      buddyId,
      userId,
      JSON.stringify({ from_user_id: userId, friendship_id: friendshipId }),
      now
    ).run()

    if (!notification.meta.changes) {
      return errorResponse('Reminder notifications are not configured', 503)
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Send reminder error:', error)
    return errorResponse('Failed to send reminder', 500)
  }
}

// POST /api/buddies/:id/messages - Send encrypted message
async function handleSendMessage(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/buddies\/(\d+)\/messages$/)
  if (!match) return errorResponse('Invalid path', 400)

  const friendshipId = parseInt(match[1])

  try {
    // Verify friendship
    const friendship = await env.database.prepare(
      'SELECT * FROM friendship WHERE id = ? AND (requester_id = ? OR addressee_id = ?) AND status_id = 2'
    ).bind(friendshipId, userId, userId).first()

    if (!friendship) return errorResponse('Friendship not found', 404)

    const body = await request.json().catch(() => null) as {
      encryptedContent: string
      ephemeralPublicKey: string
      mac: string
      nonce: string
      messageType?: string
      referenceType?: string
      referenceId?: number
    } | null

    if (!body ||
      typeof body.encryptedContent !== 'string' || !body.encryptedContent || body.encryptedContent.length > 16_000 ||
      typeof body.ephemeralPublicKey !== 'string' || !body.ephemeralPublicKey ||
      typeof body.mac !== 'string' || !body.mac ||
      typeof body.nonce !== 'string' || !body.nonce
    ) {
      return errorResponse('Invalid encrypted message payload', 400)
    }

    const now = nowISO()
    const result = await env.database.prepare(`
      INSERT INTO chat_message (friendship_id, sender_id, encrypted_content, ephemeral_public_key, mac, nonce, message_type, reference_type, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      friendshipId,
      userId,
      body.encryptedContent,
      body.ephemeralPublicKey,
      body.mac,
      body.nonce,
      body.messageType || 'text',
      body.referenceType || null,
      body.referenceId || null,
      now
    ).first()

    return jsonResponse(result || { success: true })
  } catch (error) {
    console.error('Send message error:', error)
    return errorResponse('Failed to send message', 500)
  }
}

// GET /api/buddies/:id/messages - Get encrypted messages for a friendship
async function handleGetMessages(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/buddies\/(\d+)\/messages$/)
  if (!match) return errorResponse('Invalid path', 400)

  const friendshipId = parseInt(match[1])
  const rawLimit = Number.parseInt(url.searchParams.get('limit') || '50', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50
  const before = url.searchParams.get('before')
  const beforeId = Number.parseInt(url.searchParams.get('beforeId') || '', 10)
  const hasBeforeId = before && Number.isInteger(beforeId) && beforeId > 0

  try {
    const friendship = await env.database.prepare(
      'SELECT id FROM friendship WHERE id = ? AND (requester_id = ? OR addressee_id = ?) AND status_id = 2'
    ).bind(friendshipId, userId, userId).first()

    if (!friendship) return errorResponse('Friendship not found', 404)

    const result = hasBeforeId
      ? await env.database.prepare(`
          SELECT * FROM chat_message
          WHERE friendship_id = ?
            AND (created_at < ? OR (created_at = ? AND id < ?))
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `).bind(friendshipId, before, before, beforeId, limit).all()
      : before
      ? await env.database.prepare(`
          SELECT * FROM chat_message
          WHERE friendship_id = ? AND created_at < ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `).bind(friendshipId, before, limit).all()
      : await env.database.prepare(`
          SELECT * FROM chat_message
          WHERE friendship_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `).bind(friendshipId, limit).all()

    return jsonResponse([...(result.results || [])].reverse())
  } catch (error) {
    console.error('Get messages error:', error)
    return errorResponse('Failed to get messages', 500)
  }
}

// GET /api/buddies/:id/keys - Get buddy's encryption keys
async function handleGetBuddyKeys(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/buddies\/(\d+)\/keys$/)
  if (!match) return errorResponse('Invalid path', 400)

  const friendshipId = parseInt(match[1])

  try {
    // Get friendship and determine buddy ID
    const friendship = await env.database.prepare(
      'SELECT * FROM friendship WHERE id = ? AND (requester_id = ? OR addressee_id = ?) AND status_id = 2'
    ).bind(friendshipId, userId, userId).first<Record<string, unknown>>()

    if (!friendship) return errorResponse('Friendship not found', 404)

    const buddyId = friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id

    // Get buddy's encryption keys
    const keys = await env.database.prepare(
      'SELECT identity_public_key, signed_prekey_public, signed_prekey_signature FROM user_encryption_key WHERE user_id = ?'
    ).bind(buddyId).first()

    if (!keys) return jsonResponse({ keys: null })

    // Get one unused prekey
    const prekey = await env.database.prepare(
      'SELECT prekey_id, public_key FROM user_prekey WHERE user_id = ? AND is_used = 0 LIMIT 1'
    ).bind(buddyId).first()

    if (prekey) {
      await env.database.prepare(
        'UPDATE user_prekey SET is_used = 1 WHERE user_id = ? AND prekey_id = ?'
      ).bind(buddyId, (prekey as Record<string, unknown>).prekey_id).run()
    }

    return jsonResponse({ ...keys, prekey: prekey || null })
  } catch (error) {
    console.error('Get buddy keys error:', error)
    return errorResponse('Failed to get buddy keys', 500)
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

  // PATCH /api/buddies/:id - respond to friend request
  if (request.method === 'PATCH' && path.match(/^\/api\/buddies\/\d+$/)) {
    return handleRespondToRequest(ctx)
  }

  // DELETE /api/buddies/:id - remove buddy
  if (request.method === 'DELETE' && path.match(/^\/api\/buddies\/\d+$/)) {
    return handleRemoveBuddy(ctx)
  }

  // POST /api/buddies/:id/remind
  if (request.method === 'POST' && path.match(/^\/api\/buddies\/\d+\/remind$/)) {
    return handleSendReminder(ctx)
  }

  // POST /api/buddies/:id/messages
  if (request.method === 'POST' && path.match(/^\/api\/buddies\/\d+\/messages$/)) {
    return handleSendMessage(ctx)
  }

  // GET /api/buddies/:id/messages
  if (request.method === 'GET' && path.match(/^\/api\/buddies\/\d+\/messages$/)) {
    return handleGetMessages(ctx)
  }

  // GET /api/buddies/:id/keys
  if (request.method === 'GET' && path.match(/^\/api\/buddies\/\d+\/keys$/)) {
    return handleGetBuddyKeys(ctx)
  }

  return errorResponse('Not found', 404)
}
