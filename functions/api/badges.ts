/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../lib/db'

// GET /api/badges - Get all badges
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const result = await env.database.prepare(`
      SELECT b.*, br.code as rarity_code, br.name_de as rarity_name, br.color_hex
      FROM badge b
      JOIN badge_rarity br ON b.rarity_id = br.id
      ORDER BY br.id, b.threshold_value
    `).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get badges error:', error)
    return errorResponse('Failed to get badges', 500)
  }
}
