import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_MODE, IDENTITY_CODE } from '../../../shared/identity/constants'
import { closeDatabase } from '../../../server/infrastructure/database/client'
import { createMinervaAuth } from '../../../server/modules/identity/auth/create-auth'
import { signInWithIdentifier } from '../../../server/modules/identity/sign-in/sign-in'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

const password = 'Correct-Horse-Battery-1'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-012345678901234567890')
vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3000')
vi.stubEnv('MCP_RESOURCE_URL', 'http://127.0.0.1:3000/mcp')
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
    const seedAuth = createMinervaAuth({
      mode: AUTH_MODE.TEST_SEED,
      db: database.db,
      baseURL: 'http://127.0.0.1:3000',
      trustedOrigins: ['http://127.0.0.1:3000'],
      mailer: { sendPasswordReset: async () => {} },
    })
    await seedAuth.api.signUpEmail({
      body: {
        email: 'user@example.com',
        username: 'test.user',
        displayUsername: 'Test.User',
        name: 'Test.User',
        password,
      },
    })
  } finally {
    await database.close()
  }
})

afterAll(closeDatabase)

const signIn = (identifier: string, submittedPassword = password, ip = '127.0.0.1') =>
  signInWithIdentifier({
    identifier,
    password: submittedPassword,
    ip,
    requestHeaders: new Headers(),
  })

describe('signInWithIdentifier', () => {
  it('returns a session cookie for email sign in', async () => {
    const result = await signIn(' User@Example.com ')
    expect(result.headers.get('set-cookie')).toContain('better-auth.session_token=')
  })

  it('returns a session cookie for username sign in', async () => {
    const result = await signIn(' Test.User ')
    expect(result.headers.get('set-cookie')).toContain('better-auth.session_token=')
  })

  it('updates last login only after successful authentication', async () => {
    await signIn('user@example.com')
    const database = createTestDatabase()

    try {
      const users = await database.queryClient<{ last_login_at: string | null }[]>`
        select last_login_at from "user" where email = 'user@example.com'
      `
      expect(users[0]?.last_login_at).toBeTruthy()
    } finally {
      await database.close()
    }
  })

  it('maps a disabled account to invalid credentials', async () => {
    const database = createTestDatabase()
    try {
      await database.queryClient`
        update "user" set status = 'disabled' where email = 'user@example.com'
      `
    } finally {
      await database.close()
    }

    await expect(signIn('user@example.com')).rejects.toMatchObject({
      code: IDENTITY_CODE.INVALID_CREDENTIALS,
      statusCode: 401,
    })
  })

  it('uses one response for an unknown identity and a wrong password', async () => {
    const unknown = signIn('missing@example.com', password, '127.0.0.2')
    const wrongPassword = signIn('user@example.com', 'Wrong-password-123', '127.0.0.3')

    await expect(unknown).rejects.toMatchObject({
      code: IDENTITY_CODE.INVALID_CREDENTIALS,
      statusCode: 401,
    })
    await expect(wrongPassword).rejects.toMatchObject({
      code: IDENTITY_CODE.INVALID_CREDENTIALS,
      statusCode: 401,
    })
  })

  it('rejects the sixth attempt for one IP and identity', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await expect(signIn('user@example.com', 'Wrong-password-123', '127.0.0.4'))
        .rejects.toMatchObject({ code: IDENTITY_CODE.INVALID_CREDENTIALS })
    }

    await expect(signIn('user@example.com', 'Wrong-password-123', '127.0.0.4'))
      .rejects.toMatchObject({ code: IDENTITY_CODE.RATE_LIMITED, statusCode: 429 })
  })

  it('stores no plaintext identity in rate-limit keys', async () => {
    await expect(signIn('user@example.com', 'Wrong-password-123', '127.0.0.5'))
      .rejects.toMatchObject({ code: IDENTITY_CODE.INVALID_CREDENTIALS })
    const database = createTestDatabase()

    try {
      const rows = await database.queryClient<{ key: string }[]>`select key from rate_limit`
      expect(rows).toHaveLength(1)
      expect(rows[0]?.key).toMatch(/^[a-f0-9]{64}$/)
      expect(rows[0]?.key).not.toContain('user@example.com')
    } finally {
      await database.close()
    }
  })
})
