/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../../lib/types'
import { jsonResponse, corsResponse } from '../../lib/db'

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    const result = await env.database.prepare('SELECT 1 as ok').first<{ ok: number }>()
    return jsonResponse({
      status: 'ok',
      database: result?.ok === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return jsonResponse({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    }, 503)
  }
}
