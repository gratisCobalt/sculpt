import pg, { type QueryResult, type QueryResultRow } from 'pg'

const pool = new pg.Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL || 'postgresql://sculpt:sculpt_dev_2026@localhost:5432/sculpt',
})

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> => {
    return pool.query(text, params)
  },
  
  getClient: () => pool.connect(),
}

export default db
