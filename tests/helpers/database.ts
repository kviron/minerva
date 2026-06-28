import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export const TEST_DATABASE_URL = 'postgresql://minerva:minerva@127.0.0.1:5433/minerva_test'

export function createTestDatabase() {
  const queryClient = postgres(TEST_DATABASE_URL, { max: 1 })

  return {
    db: drizzle(queryClient),
    queryClient,
    close: () => queryClient.end(),
  }
}

export async function resetTestDatabase() {
  const sql = postgres(TEST_DATABASE_URL, { max: 1 })

  try {
    await sql`drop schema if exists public cascade`
    await sql`drop schema if exists drizzle cascade`
    await sql`create schema public`
  } finally {
    await sql.end()
  }
}
