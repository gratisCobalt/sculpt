/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../lib/db'

// GET /api/body-parts
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const result = await env.database.prepare(
      'SELECT * FROM body_part ORDER BY id'
    ).all()
    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get body parts error:', error)
    return errorResponse('Failed to get body parts', 500)
  }
}
