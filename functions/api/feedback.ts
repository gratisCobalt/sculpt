/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse, nowISO } from '../lib/db'
import { getUserIdFromRequest } from '../lib/auth'

// POST /api/feedback - Submit user feedback
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const userId = await getUserIdFromRequest(request, env)
  if (!userId) return errorResponse('Unauthorized', 401)

  try {
    const body = await request.json() as {
      message: string
      imageUrls?: string[]
      category?: string
    }

    if (!body.message || body.message.trim().length === 0) {
      return errorResponse('Message is required', 400)
    }

    // Ensure table exists
    try {
      await env.database.prepare(`
        CREATE TABLE IF NOT EXISTS user_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          image_urls TEXT DEFAULT '[]',
          category TEXT DEFAULT 'general',
          status TEXT DEFAULT 'new',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run()
    } catch {
      // Table likely already exists
    }

    const now = nowISO()
    await env.database.prepare(`
      INSERT INTO user_feedback (user_id, message, image_urls, category, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      body.message.trim(),
      JSON.stringify(body.imageUrls || []),
      body.category || 'general',
      now
    ).run()

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Submit feedback error:', error)
    return errorResponse('Failed to submit feedback', 500)
  }
}
