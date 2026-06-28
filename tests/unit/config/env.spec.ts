import { describe, expect, it } from 'vitest'
import { parseServerEnv } from '../../../shared/config/env'

const valid = {
  DATABASE_URL: 'postgresql://minerva:minerva@127.0.0.1:5432/minerva',
  BETTER_AUTH_SECRET: '01234567890123456789012345678901',
  BETTER_AUTH_URL: 'http://127.0.0.1:3000',
  TRUSTED_ORIGINS: 'http://127.0.0.1:3000,http://localhost:3000',
  RATE_LIMIT_HMAC_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  MAIL_FROM: 'Minerva <no-reply@minerva.local>',
  MAILPIT_API_URL: 'http://127.0.0.1:8025',
}

describe('parseServerEnv', () => {
  it('parses trusted origins and numeric SMTP port', () => {
    const env = parseServerEnv(valid)

    expect(env.TRUSTED_ORIGINS).toEqual([
      'http://127.0.0.1:3000',
      'http://localhost:3000',
    ])
    expect(env.SMTP_PORT).toBe(1025)
  })

  it('rejects short auth secrets', () => {
    expect(() => parseServerEnv({ ...valid, BETTER_AUTH_SECRET: 'short' })).toThrow()
  })

  it('rejects short rate-limit secrets', () => {
    expect(() => parseServerEnv({ ...valid, RATE_LIMIT_HMAC_SECRET: 'short' })).toThrow()
  })
})
