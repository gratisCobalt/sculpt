/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../lib/types'
import { jsonResponse, errorResponse, corsResponse } from '../lib/db'

// D1 Connection Test Endpoint
// GET /api/d1-test - Tests that D1 database binding works
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    // Check if D1 binding exists
    if (!env.database) {
      return errorResponse('D1 database binding not found. Check wrangler.toml configuration.', 500)
    }

    // Try a simple query to verify connection
    const result = await env.database.prepare(
      "SELECT 'D1 connection works!' as message, datetime('now') as server_time"
    ).first<{ message: string; server_time: string }>()

    if (!result) {
      return errorResponse('D1 query returned no result', 500)
    }

    // Try to get table count (will be 0 if schema not applied yet)
    const tables = await env.database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"
    ).all<{ name: string }>()

    return jsonResponse({
      ok: true,
      message: result.message,
      serverTime: result.server_time,
      tablesFound: tables.results?.length ?? 0,
      tableNames: tables.results?.map(t => t.name) ?? [],
      hint: tables.results?.length === 0 
        ? 'No tables found. Run: npx wrangler d1 execute sculpt-db --file=db/d1/001_schema.sql'
        : 'Schema is applied! Ready to migrate data.',
    })
  } catch (error) {
    console.error('D1 test error:', error)
    return errorResponse(
      `D1 connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}
