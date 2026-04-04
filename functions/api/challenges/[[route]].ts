/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Challenge API Routes
// Handles: GET /api/challenges, GET /api/challenges/types, GET /api/challenges/history,
//          POST /api/challenges, PATCH /api/challenges/:id/accept|decline|cancel

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// GET /api/challenges/types
async function handleGetTypes(ctx: RequestContext): Promise<Response> {
  const { env } = ctx

  try {
    const result = await env.database.prepare(
      'SELECT * FROM challenge_type ORDER BY id'
    ).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get challenge types error:', error)
    return errorResponse('Failed to get challenge types', 500)
  }
}

// GET /api/challenges - Active challenges
async function handleGetActive(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const result = await env.database.prepare(`
      SELECT bc.*,
        ct.code as type_code, ct.name_de as type_name_de, ct.icon_name as type_icon,
        challenger.display_name as challenger_name, challenger.avatar_url as challenger_avatar,
        opponent.display_name as opponent_name, opponent.avatar_url as opponent_avatar,
        e.name_de as exercise_name_de, e.name as exercise_name
      FROM buddy_challenge bc
      JOIN challenge_type ct ON bc.challenge_type_id = ct.id
      JOIN app_user challenger ON bc.challenger_id = challenger.id
      JOIN app_user opponent ON bc.opponent_id = opponent.id
      LEFT JOIN exercise e ON bc.exercise_id = e.id
      WHERE (bc.challenger_id = ? OR bc.opponent_id = ?)
        AND bc.status IN ('pending', 'active')
      ORDER BY bc.created_at DESC
    `).bind(userId, userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get active challenges error:', error)
    return errorResponse('Failed to get challenges', 500)
  }
}

// GET /api/challenges/history
async function handleGetHistory(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100)

  try {
    const result = await env.database.prepare(`
      SELECT bc.*,
        ct.code as type_code, ct.name_de as type_name_de, ct.icon_name as type_icon,
        challenger.display_name as challenger_name, challenger.avatar_url as challenger_avatar,
        opponent.display_name as opponent_name, opponent.avatar_url as opponent_avatar,
        e.name_de as exercise_name_de, e.name as exercise_name
      FROM buddy_challenge bc
      JOIN challenge_type ct ON bc.challenge_type_id = ct.id
      JOIN app_user challenger ON bc.challenger_id = challenger.id
      JOIN app_user opponent ON bc.opponent_id = opponent.id
      LEFT JOIN exercise e ON bc.exercise_id = e.id
      WHERE (bc.challenger_id = ? OR bc.opponent_id = ?)
        AND bc.status IN ('completed', 'cancelled', 'declined')
      ORDER BY bc.created_at DESC
      LIMIT ?
    `).bind(userId, userId, limit).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get challenge history error:', error)
    return errorResponse('Failed to get challenge history', 500)
  }
}

// POST /api/challenges - Create challenge
async function handleCreate(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as {
      opponentId: string
      challengeTypeId: number
      exerciseId?: number
      targetValue?: number
      wagerCoins?: number
      endsAt?: string
      durationPreset?: string
    }

    // Verify friendship exists
    const friendship = await env.database.prepare(`
      SELECT id FROM friendship
      WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
        AND status_id = 2
    `).bind(userId, body.opponentId, body.opponentId, userId).first<{ id: number }>()

    if (!friendship) return errorResponse('Must be friends to challenge', 400)

    const now = nowISO()

    // Calculate end date
    let endsAt = body.endsAt
    if (!endsAt && body.durationPreset) {
      const durations: Record<string, number> = {
        '1h': 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000,
      }
      const ms = durations[body.durationPreset] || durations['1d']
      endsAt = new Date(Date.now() + ms).toISOString()
    }
    if (!endsAt) {
      endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }

    const result = await env.database.prepare(`
      INSERT INTO buddy_challenge (friendship_id, challenge_type_id, exercise_id, challenger_id, opponent_id, target_value, wager_coins, created_at, starts_at, ends_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      RETURNING *
    `).bind(
      friendship.id,
      body.challengeTypeId,
      body.exerciseId || null,
      userId,
      body.opponentId,
      body.targetValue || null,
      body.wagerCoins || 0,
      now,
      now,
      endsAt
    ).first()

    return jsonResponse(result)
  } catch (error) {
    console.error('Create challenge error:', error)
    return errorResponse('Failed to create challenge', 500)
  }
}

// PATCH /api/challenges/:id/accept
async function handleAccept(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/challenges\/(\d+)\/accept$/)
  if (!match) return errorResponse('Invalid path', 400)

  const challengeId = parseInt(match[1])

  try {
    const challenge = await env.database.prepare(
      "SELECT * FROM buddy_challenge WHERE id = ? AND opponent_id = ? AND status = 'pending'"
    ).bind(challengeId, userId).first()

    if (!challenge) return errorResponse('Challenge not found', 404)

    const now = nowISO()
    const result = await env.database.prepare(
      "UPDATE buddy_challenge SET status = 'active', accepted_at = ?, starts_at = ? WHERE id = ? RETURNING *"
    ).bind(now, now, challengeId).first()

    return jsonResponse(result)
  } catch (error) {
    console.error('Accept challenge error:', error)
    return errorResponse('Failed to accept challenge', 500)
  }
}

// PATCH /api/challenges/:id/decline
async function handleDecline(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/challenges\/(\d+)\/decline$/)
  if (!match) return errorResponse('Invalid path', 400)

  const challengeId = parseInt(match[1])

  try {
    const result = await env.database.prepare(
      "UPDATE buddy_challenge SET status = 'declined' WHERE id = ? AND opponent_id = ? AND status = 'pending' RETURNING *"
    ).bind(challengeId, userId).first()

    if (!result) return errorResponse('Challenge not found', 404)
    return jsonResponse(result)
  } catch (error) {
    console.error('Decline challenge error:', error)
    return errorResponse('Failed to decline challenge', 500)
  }
}

// PATCH /api/challenges/:id/cancel
async function handleCancel(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/^\/api\/challenges\/(\d+)\/cancel$/)
  if (!match) return errorResponse('Invalid path', 400)

  const challengeId = parseInt(match[1])

  try {
    const result = await env.database.prepare(
      "UPDATE buddy_challenge SET status = 'cancelled' WHERE id = ? AND (challenger_id = ? OR opponent_id = ?) AND status IN ('pending', 'active') RETURNING *"
    ).bind(challengeId, userId, userId).first()

    if (!result) return errorResponse('Challenge not found', 404)
    return jsonResponse(result)
  } catch (error) {
    console.error('Cancel challenge error:', error)
    return errorResponse('Failed to cancel challenge', 500)
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

  if (request.method === 'GET' && path === '/api/challenges/types') {
    return handleGetTypes(ctx)
  }
  if (request.method === 'GET' && path === '/api/challenges') {
    return handleGetActive(ctx)
  }
  if (request.method === 'GET' && path === '/api/challenges/history') {
    return handleGetHistory(ctx)
  }
  if (request.method === 'POST' && path === '/api/challenges') {
    return handleCreate(ctx)
  }
  if (request.method === 'PATCH' && path.match(/^\/api\/challenges\/\d+\/accept$/)) {
    return handleAccept(ctx)
  }
  if (request.method === 'PATCH' && path.match(/^\/api\/challenges\/\d+\/decline$/)) {
    return handleDecline(ctx)
  }
  if (request.method === 'PATCH' && path.match(/^\/api\/challenges\/\d+\/cancel$/)) {
    return handleCancel(ctx)
  }

  return errorResponse('Not found', 404)
}
