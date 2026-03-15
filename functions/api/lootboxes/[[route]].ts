/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../../lib/db'
import { getUserIdFromRequest } from '../../lib/auth'

// Loot Box API Routes

interface RequestContext {
  request: Request
  env: Env
  url: URL
}

// GET /api/lootboxes - Get user's pending loot boxes
async function handleGetLootboxes(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const result = await env.database.prepare(`
      SELECT ulb.*, br.code as rarity_code, br.name_de as rarity_name, br.color_hex
      FROM user_loot_box ulb
      JOIN badge_rarity br ON ulb.rarity_id = br.id
      WHERE ulb.user_id = ? AND ulb.is_opened = 0
      ORDER BY ulb.earned_at DESC
    `).bind(userId).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get lootboxes error:', error)
    return errorResponse('Failed to get loot boxes', 500)
  }
}

// POST /api/lootboxes/:id/click - Click a loot box (up to 3 clicks)
async function handleClickLootbox(ctx: RequestContext): Promise<Response> {
  const { request, env, url } = ctx

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  const match = url.pathname.match(/\/api\/lootboxes\/(\d+)\/click$/)
  if (!match) return errorResponse('Invalid path', 400)

  const lootboxId = parseInt(match[1])

  try {
    // Get loot box
    const lootbox = await env.database.prepare(
      'SELECT * FROM user_loot_box WHERE id = ? AND user_id = ? AND is_opened = 0'
    ).bind(lootboxId, userId).first<Record<string, unknown>>()

    if (!lootbox) {
      return errorResponse('Loot box not found', 404)
    }

    const clicksRemaining = (lootbox.clicks_remaining as number) - 1
    let rarityId = lootbox.rarity_id as number

    // Try to upgrade rarity if clicks remaining
    if (clicksRemaining >= 0) {
      const config = await env.database.prepare(
        'SELECT upgrade_chance FROM loot_box_config WHERE rarity_id = ?'
      ).bind(rarityId).first<{ upgrade_chance: number }>()

      if (config && Math.random() < config.upgrade_chance && rarityId < 4) {
        rarityId++
      }

      await env.database.prepare(
        'UPDATE user_loot_box SET clicks_remaining = ?, rarity_id = ? WHERE id = ?'
      ).bind(clicksRemaining, rarityId, lootboxId).run()
    }

    // If no clicks remaining, open the box
    if (clicksRemaining <= 0) {
      const config = await env.database.prepare(
        'SELECT min_coins, max_coins FROM loot_box_config WHERE rarity_id = ?'
      ).bind(rarityId).first<{ min_coins: number; max_coins: number }>()

      const minCoins = config?.min_coins || 5
      const maxCoins = config?.max_coins || 15
      const coins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins

      const now = nowISO()

      // Mark as opened and record coins
      await env.database.prepare(
        'UPDATE user_loot_box SET is_opened = 1, coins_awarded = ?, opened_at = ? WHERE id = ?'
      ).bind(coins, now, lootboxId).run()

      // Add coins to user
      await env.database.prepare(
        'UPDATE app_user SET hantel_coins = hantel_coins + ?, updated_at = ? WHERE id = ?'
      ).bind(coins, now, userId).run()

      return jsonResponse({
        opened: true,
        coins_awarded: coins,
        rarity_id: rarityId,
      })
    }

    return jsonResponse({
      opened: false,
      clicks_remaining: clicksRemaining,
      rarity_id: rarityId,
      upgraded: rarityId !== lootbox.rarity_id,
    })
  } catch (error) {
    console.error('Click lootbox error:', error)
    return errorResponse('Failed to click loot box', 500)
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

  if (request.method === 'GET' && path === '/api/lootboxes') {
    return handleGetLootboxes(ctx)
  }
  if (request.method === 'POST' && path.match(/^\/api\/lootboxes\/\d+\/click$/)) {
    return handleClickLootbox(ctx)
  }

  return errorResponse('Not found', 404)
}
