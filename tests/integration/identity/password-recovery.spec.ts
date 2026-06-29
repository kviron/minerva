import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { H3Event } from 'h3'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_MODE, IDENTITY_CODE } from '../../../shared/identity/constants'
import { closeDatabase } from '../../../server/infrastructure/database/client'
import { createMinervaAuth } from '../../../server/modules/identity/create-auth'
import { requestPasswordReset, resetPassword } from '../../../server/modules/identity/password-recovery'
import { requireSession } from '../../../server/modules/identity/require-session'
import { signInWithIdentifier } from '../../../server/modules/identity/sign-in'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

const email = 'user@example.com'
const oldPassword = 'Correct-Horse-Battery-1'
const newPassword = 'Different-Horse-Battery-2'
const mailpitURL = 'http://127.0.0.1:8025'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-012345678901234567890')
vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3000')
vi.stubEnv('TRUSTED_ORIGINS', 'http://127.0.0.1:3000')
vi.stubEnv('RATE_LIMIT_HMAC_SECRET', 'test-rate-limit-secret-01234567890')
vi.stubEnv('SMTP_HOST', '127.0.0.1')
vi.stubEnv('SMTP_PORT', '1025')
vi.stubEnv('MAIL_FROM', 'Minerva <no-reply@minerva.local>')
vi.stubEnv('MAILPIT_API_URL', mailpitURL)

beforeEach(async () => {
  await fetch(`${mailpitURL}/api/v1/messages`, { method: 'DELETE' })
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
      body: { email, username: 'test.user', name: 'Test.User', password: oldPassword },
    })
  } finally {
    await database.close()
  }
})

afterAll(closeDatabase)

async function getMessageCount() {
  const response = await fetch(`${mailpitURL}/api/v1/messages`)
  const data = await response.json() as { messages_count: number }
  return data.messages_count
}

async function getResetToken() {
  const response = await fetch(
    `${mailpitURL}/view/latest.txt?query=${encodeURIComponent(`to:${email}`)}`,
  )
  expect(response.ok).toBe(true)
  const text = await response.text()
  const token = text.match(/\/auth\/reset-password\/([^\s]+)/)?.[1]
  expect(token).toBeTruthy()
  return decodeURIComponent(token!)
}

describe('password recovery', () => {
  it('returns the shared request response for known and unknown accounts', async () => {
    await expect(requestPasswordReset({ email, ip: '127.0.0.20' }))
      .resolves.toBe(IDENTITY_CODE.RESET_REQUEST_ACCEPTED)
    await expect(requestPasswordReset({ email: 'missing@example.com', ip: '127.0.0.21' }))
      .resolves.toBe(IDENTITY_CODE.RESET_REQUEST_ACCEPTED)
  })

  it('delivers a reset link for a known account through Mailpit', async () => {
    await requestPasswordReset({ email, ip: '127.0.0.22' })
    expect(await getMessageCount()).toBe(1)
    expect(await getResetToken()).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('sends no message for an unknown account', async () => {
    await requestPasswordReset({ email: 'missing@example.com', ip: '127.0.0.23' })
    expect(await getMessageCount()).toBe(0)
  })

  it('rejects an expired 30-minute token', async () => {
    await requestPasswordReset({ email, ip: '127.0.0.24' })
    const token = await getResetToken()
    const database = createTestDatabase()
    try {
      const rows = await database.queryClient<{ remaining_seconds: number }[]>`
        select extract(epoch from (expires_at - now()))::integer as remaining_seconds
        from verification
      `
      expect(rows[0]?.remaining_seconds).toBeGreaterThan(1700)
      expect(rows[0]?.remaining_seconds).toBeLessThanOrEqual(1800)

      await database.queryClient`
        update verification set expires_at = now() - interval '1 second'
        where identifier is not null
      `
    } finally {
      await database.close()
    }

    await expect(resetPassword({ token, newPassword, ip: '127.0.0.24' }))
      .rejects.toMatchObject({ code: IDENTITY_CODE.RESET_TOKEN_INVALID })
  })

  it('consumes a reset token only once', async () => {
    await requestPasswordReset({ email, ip: '127.0.0.25' })
    const token = await getResetToken()

    await expect(resetPassword({ token, newPassword, ip: '127.0.0.25' })).resolves.toBeUndefined()
    await expect(resetPassword({ token, newPassword, ip: '127.0.0.25' }))
      .rejects.toMatchObject({ code: IDENTITY_CODE.RESET_TOKEN_INVALID })
  })

  it('rejects a mutated reset token', async () => {
    await requestPasswordReset({ email, ip: '127.0.0.28' })
    const token = await getResetToken()

    await expect(resetPassword({ token: `${token}x`, newPassword, ip: '127.0.0.28' }))
      .rejects.toMatchObject({ code: IDENTITY_CODE.RESET_TOKEN_INVALID })
  })

  it('revokes existing sessions after password reset', async () => {
    const signedIn = await signInWithIdentifier({
      identifier: email, password: oldPassword, ip: '127.0.0.26', requestHeaders: new Headers(),
    })
    const cookie = signedIn.headers.get('set-cookie')?.split(';', 1)[0] ?? ''
    await requestPasswordReset({ email, ip: '127.0.0.26' })
    const token = await getResetToken()
    await resetPassword({ token, newPassword, ip: '127.0.0.26' })

    await expect(requireSession({ headers: new Headers({ cookie }) } as H3Event))
      .rejects.toMatchObject({ code: IDENTITY_CODE.AUTH_REQUIRED })
    await expect(signInWithIdentifier({
      identifier: email, password: newPassword, ip: '127.0.0.27', requestHeaders: new Headers(),
    })).resolves.toHaveProperty('headers')
  })
})
