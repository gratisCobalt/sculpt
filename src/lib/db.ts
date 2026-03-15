// Legacy database connection - no longer used
// Frontend now uses fetch() to call the API endpoints in /functions/api/
// This file is kept for reference only

export const db = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query: async <T = unknown>(_text: string, _params?: unknown[]): Promise<{ rows: T[] }> => {
    console.warn('Direct database access is deprecated. Use API endpoints instead.')
    return { rows: [] }
  },
  
  getClient: () => {
    throw new Error('Direct database access is deprecated. Use API endpoints instead.')
  },
}

export default db
