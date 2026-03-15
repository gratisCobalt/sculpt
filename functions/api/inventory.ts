/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../lib/db'
import { getUserIdFromRequest } from '../lib/auth'

// GET /api/inventory - Get user's inventory
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
    const result = await env.database.prepare(`
      SELECT ui.*, si.code, si.name_de, si.name_en, si.icon_name,
             br.code as rarity_code, br.color_hex
      FROM user_inventory ui
      JOIN shop_item si ON ui.shop_item_id = si.id
      LEFT JOIN badge_rarity br ON si.rarity_id = br.id
      WHERE ui.user_id = ? AND ui.quantity > 0
    `).bind(userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get inventory error:', error)
    return errorResponse('Failed to get inventory', 500)
  }
}
