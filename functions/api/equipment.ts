/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../lib/db'

// GET /api/equipment
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
      'SELECT * FROM equipment ORDER BY name_en'
    ).all()
    return jsonResponse(result.results || [])
  } catch (error) {
    console.error('Get equipment error:', error)
    return errorResponse('Failed to get equipment', 500)
  }
}
