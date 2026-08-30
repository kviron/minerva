import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeAll, expect, it } from 'vitest'
import { REQUIRED_MIGRATION_CREATED_AT } from '../../../server/config/migration-manifest'
import { checkDatabase, checkDatabaseMigrations } from '../../../server/infrastructure/database/health'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

beforeAll(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
  }
  finally {
    await database.close()
  }
})

it('reports a real PostgreSQL connection as ready', async () => {
  await expect(
    checkDatabase(TEST_DATABASE_URL),
  ).resolves.toEqual({ database: 'ok' })
})

it('reports only databases containing the migration required by this release as ready', async () => {
  await expect(checkDatabaseMigrations(TEST_DATABASE_URL, REQUIRED_MIGRATION_CREATED_AT)).resolves.toBeUndefined()
  await expect(checkDatabaseMigrations(TEST_DATABASE_URL, REQUIRED_MIGRATION_CREATED_AT + 1)).rejects.toThrow()
})
