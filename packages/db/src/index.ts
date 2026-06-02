import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema/index.js'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to connect to Postgres')
}

export const pool = new pg.Pool({
  connectionString,
})

export const db = drizzle(pool, { schema })

export * from './schema/index.js'
