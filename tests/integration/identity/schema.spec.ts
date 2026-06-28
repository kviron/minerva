import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, expect, it } from 'vitest'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

beforeEach(resetTestDatabase)

it('creates the Better Auth identity tables', async () => {
  const database = createTestDatabase()

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })

    const tables = await database.queryClient<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `

    expect(tables.map(table => table.table_name)).toEqual(expect.arrayContaining([
      'user',
      'account',
      'session',
      'verification',
      'rate_limit',
    ]))
  } finally {
    await database.close()
  }
})
