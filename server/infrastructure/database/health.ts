import postgres from 'postgres'

export async function checkDatabase(url: string) {
  const sql = postgres(url, { max: 1, connect_timeout: 3, connection: { statement_timeout: 3_000 } })

  try {
    await sql`select 1`
    return { database: 'ok' as const }
  } finally {
    await sql.end()
  }
}

export async function checkDatabaseMigrations(url: string, requiredCreatedAt: number): Promise<void> {
  const sql = postgres(url, { max: 1, connect_timeout: 3, connection: { statement_timeout: 3_000 } })

  try {
    const rows = await sql<{ createdAt: string | null }[]>`
      select max(created_at)::text as "createdAt"
      from drizzle.__drizzle_migrations
    `
    const latestCreatedAt = Number(rows[0]?.createdAt ?? Number.NaN)
    if (!Number.isSafeInteger(latestCreatedAt) || latestCreatedAt < requiredCreatedAt) {
      throw new Error('Required database migration is unavailable')
    }
  }
  finally {
    await sql.end()
  }
}
