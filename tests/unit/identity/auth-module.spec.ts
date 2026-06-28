import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('can be imported during a build without runtime secrets', async () => {
  vi.stubEnv('DATABASE_URL', '')
  vi.stubEnv('BETTER_AUTH_SECRET', '')
  vi.stubEnv('BETTER_AUTH_URL', '')
  vi.stubEnv('TRUSTED_ORIGINS', '')
  vi.stubEnv('RATE_LIMIT_HMAC_SECRET', '')
  vi.stubEnv('SMTP_HOST', '')
  vi.stubEnv('SMTP_PORT', '')
  vi.stubEnv('MAIL_FROM', '')
  vi.stubEnv('MAILPIT_API_URL', '')

  await expect(import('../../../server/modules/identity/auth')).resolves.toMatchObject({
    getAuth: expect.any(Function),
  })
})
