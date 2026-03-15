/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../lib/db'

// GET /api/levels - Get all level definitions
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
      SELECT * FROM user_level ORDER BY level
    `).all()

    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get levels error:', error)
    return errorResponse('Failed to get levels', 500)
  }
}
