import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { H3Event } from 'h3'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { AUTH_MODE, IDENTITY_CODE } from '../../../shared/identity/constants'
import { closeDatabase } from '../../../server/infrastructure/database/client'
import { createMinervaAuth } from '../../../server/modules/identity/create-auth'
import { requireSession } from '../../../server/modules/identity/require-session'
import { signInWithIdentifier } from '../../../server/modules/identity/sign-in'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-012345678901234567890')
vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3000')
vi.stubEnv('TRUSTED_ORIGINS', 'http://127.0.0.1:3000')
vi.stubEnv('RATE_LIMIT_HMAC_SECRET', 'test-rate-limit-secret-01234567890')
vi.stubEnv('SMTP_HOST', '127.0.0.1')
vi.stubEnv('SMTP_PORT', '1025')
vi.stubEnv('MAIL_FROM', 'Minerva <no-reply@minerva.local>')
vi.stubEnv('MAILPIT_API_URL', 'http://127.0.0.1:8025')

beforeEach(async () => {
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
        email: 'user@example.com', username: 'test.user', name: 'Test.User',
        password: 'Correct-Horse-Battery-1',
      },
    })
  } finally {
    await database.close()
  }
})

afterAll(closeDatabase)

it('rejects a request without a session', async () => {
  const event = { headers: new Headers() } as H3Event
  await expect(requireSession(event)).rejects.toMatchObject({ code: IDENTITY_CODE.AUTH_REQUIRED })
})

it('returns the authenticated database session', async () => {
  const signedIn = await signInWithIdentifier({
    identifier: 'user@example.com',
    password: 'Correct-Horse-Battery-1',
    ip: '127.0.0.10',
    requestHeaders: new Headers(),
  })
  const setCookie = signedIn.headers.get('set-cookie')
  const event = {
    headers: new Headers({ cookie: setCookie?.split(';', 1)[0] ?? '' }),
  } as H3Event

  const session = await requireSession(event)
  expect(session.user.email).toBe('user@example.com')
})
