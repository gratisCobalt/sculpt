import pg from 'pg'

const pool = new pg.Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL || 'postgresql://sculpt:sculpt_dev_2026@localhost:5432/sculpt',
})

export const db = {
  query: <T = unknown>(text: string, params?: unknown[]): Promise<pg.QueryResult<T>> => {
    return pool.query(text, params)
  },
  
  getClient: () => pool.connect(),
}

export default db
