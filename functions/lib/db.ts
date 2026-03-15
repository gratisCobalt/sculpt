// JSON response helper
export function generateUUID(): string {
  return crypto.randomUUID()
}

// Get current timestamp in ISO 8601 format
export function nowISO(): string {
  return new Date().toISOString()
}

// Helper to check if a value is null/undefined
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

// COALESCE helper - returns first non-null value
export function coalesce<T>(...values: (T | null | undefined)[]): T | null {
  for (const value of values) {
    if (!isNullish(value)) return value
  }
  return null
}

// Build SET clause for UPDATE queries with COALESCE
export function buildUpdateSet(
  fields: Record<string, unknown>,
  startIndex = 1
): { clause: string; params: unknown[]; nextIndex: number } {
  const setClauses: string[] = []
  const params: unknown[] = []
  let idx = startIndex

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      setClauses.push(`${key} = COALESCE(?${idx}, ${key})`)
      params.push(value)
      idx++
    }
  }

  return {
    clause: setClauses.join(', '),
    params,
    nextIndex: idx
  }
}

// Parse date intervals for SQLite
// Returns ISO date string for "X days ago"
export function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

// Get start of current week (Monday)
export function startOfWeek(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // adjust for Sunday
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

// Get CORS origin from environment or default to wildcard
export function getCorsOrigin(env?: { ALLOWED_ORIGIN?: string }): string {
  return env?.ALLOWED_ORIGIN || '*'
}

// JSON response helper
export function jsonResponse(data: unknown, status = 200, env?: { ALLOWED_ORIGIN?: string }): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getCorsOrigin(env),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Error response helper
export function errorResponse(message: string, status = 500, env?: { ALLOWED_ORIGIN?: string }): Response {
  return jsonResponse({ error: message }, status, env)
}

// Handle CORS preflight
export function corsResponse(env?: { ALLOWED_ORIGIN?: string }): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(env),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
