/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Shop API Routes

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// GET /api/shop - List shop items
async function handleGetShop(ctx: RequestContext): Promise<Response> {
  const { env } = ctx

  try {
    const result = await env.database.prepare(`
      SELECT si.*, sic.code as category_code, sic.name_de as category_name_de,
             br.code as rarity_code, br.name_de as rarity_name_de, br.color_hex
      FROM shop_item si
      JOIN shop_item_category sic ON si.category_id = sic.id
      LEFT JOIN badge_rarity br ON si.rarity_id = br.id
      WHERE si.is_active = 1
      ORDER BY si.price_coins
    `).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get shop items error:', error)
    return errorResponse('Failed to get shop items', 500)
  }
}

// POST /api/shop/purchase - Purchase an item
async function handlePurchase(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as { item_id: number; quantity?: number }
    const { item_id, quantity = 1 } = body

    // Get item details
    const item = await env.database.prepare(
      'SELECT * FROM shop_item WHERE id = ? AND is_active = 1'
    ).bind(item_id).first<Record<string, unknown>>()

    if (!item) {
      return errorResponse('Item not found', 404)
    }

    const totalPrice = (item.price_coins as number) * quantity

    // Check user has enough coins
    const user = await env.database.prepare(
      'SELECT hantel_coins FROM app_user WHERE id = ?'
    ).bind(userId).first<{ hantel_coins: number }>()

    if (!user || user.hantel_coins < totalPrice) {
      return errorResponse('Insufficient coins', 400)
    }

    // Check max stack limit
    if (item.max_stack) {
      const existing = await env.database.prepare(
        'SELECT quantity FROM user_inventory WHERE user_id = ? AND shop_item_id = ?'
      ).bind(userId, item_id).first<{ quantity: number }>()

      const currentQty = existing?.quantity || 0
      if (currentQty + quantity > (item.max_stack as number)) {
        return errorResponse(`Maximum ${item.max_stack} of this item allowed`, 400)
      }
    }

    const now = nowISO()

    // Deduct coins
    await env.database.prepare(
      'UPDATE app_user SET hantel_coins = hantel_coins - ?, updated_at = ? WHERE id = ?'
    ).bind(totalPrice, now, userId).run()

    // Add to inventory
    await env.database.prepare(`
      INSERT INTO user_inventory (user_id, shop_item_id, quantity, purchased_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, shop_item_id) 
      DO UPDATE SET quantity = quantity + ?
    `).bind(userId, item_id, quantity, now, quantity).run()

    // Record purchase history
    await env.database.prepare(`
      INSERT INTO purchase_history (user_id, shop_item_id, quantity, total_price, purchased_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, item_id, quantity, totalPrice, now).run()

    return jsonResponse({ success: true, new_balance: user.hantel_coins - totalPrice })
  } catch (error) {
    console.error('Purchase error:', error)
    return errorResponse('Failed to purchase item', 500)
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

  // Shop routes
  if (request.method === 'GET' && path === '/api/shop') {
    return handleGetShop(ctx)
  }
  if (request.method === 'POST' && path === '/api/shop/purchase') {
    return handlePurchase(ctx)
  }
  return errorResponse('Not found', 404)
}
