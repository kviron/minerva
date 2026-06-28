import postgres from 'postgres'

export async function checkDatabase(url: string) {
  const sql = postgres(url, { max: 1 })

  try {
    await sql`select 1`
    return { database: 'ok' as const }
  } finally {
    await sql.end()
  }
}
