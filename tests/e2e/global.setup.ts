import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { AUTH_MODE } from '../../shared/identity/constants'
import { createMinervaAuth } from '../../server/modules/identity/auth/create-auth'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../helpers/database'

export default async function globalSetup() {
  process.env.DATABASE_URL = TEST_DATABASE_URL
  process.env.BETTER_AUTH_SECRET = 'test-secret-012345678901234567890'
  process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000'

  await fetch('http://127.0.0.1:8025/api/v1/messages', { method: 'DELETE' })
  await resetTestDatabase()
  const database = createTestDatabase()

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    const auth = createMinervaAuth({
      mode: AUTH_MODE.TEST_SEED,
      db: database.db,
      baseURL: 'http://127.0.0.1:3000',
      trustedOrigins: ['http://127.0.0.1:3000'],
      mailer: { sendPasswordReset: async () => {} },
    })
    await auth.api.signUpEmail({
      body: {
        email: 'user@example.com',
        username: 'test.user',
        displayUsername: 'Test.User',
        name: 'Test.User',
        password: 'Correct-Horse-Battery-1',
      },
    })
  } finally {
    await database.close()
  }
}
