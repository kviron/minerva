import { describe, expect, it } from 'vitest'
import { parseCredentialEncryptionEnv, parseServerEnv } from '../../../shared/config/env'

const valid = {
  DATABASE_URL: 'postgresql://minerva:minerva@127.0.0.1:5432/minerva',
  BETTER_AUTH_SECRET: '01234567890123456789012345678901',
  BETTER_AUTH_URL: 'http://127.0.0.1:3000',
  MCP_RESOURCE_URL: 'http://127.0.0.1:3000/mcp',
  TRUSTED_ORIGINS: 'http://127.0.0.1:3000,http://localhost:3000',
  RATE_LIMIT_HMAC_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  MAIL_FROM: 'Minerva <no-reply@minerva.local>',
  MAILPIT_API_URL: 'http://127.0.0.1:8025',
  CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION: '1',
  CREDENTIAL_ENCRYPTION_KEYS: `1:${Buffer.alloc(32, 1).toString('base64')}`,
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

  it('accepts one exact HTTPS or loopback HTTP MCP resource without query or fragment', () => {
    expect(parseServerEnv(valid).MCP_RESOURCE_URL).toBe('http://127.0.0.1:3000/mcp')
    expect(parseServerEnv({ ...valid, MCP_RESOURCE_URL: 'https://minerva.example/mcp' }).MCP_RESOURCE_URL)
      .toBe('https://minerva.example/mcp')

    for (const MCP_RESOURCE_URL of [
      'http://minerva.example/mcp',
      'https://minerva.example/mcp/',
      'https://user@minerva.example/mcp',
      'https://minerva.example/mcp?tenant=a',
      'https://minerva.example/mcp#fragment',
      'https://minerva.example/other',
    ]) {
      expect(() => parseServerEnv({ ...valid, MCP_RESOURCE_URL })).toThrow()
    }
  })

  it('parses versioned 256-bit credential encryption keys', () => {
    const env = parseCredentialEncryptionEnv(valid)

    expect(env.CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION).toBe(1)
    expect(env.CREDENTIAL_ENCRYPTION_KEYS.get(1)).toEqual(Buffer.alloc(32, 1))
  })

  it('rejects missing, duplicate, malformed, and non-active credential keys', () => {
    const key = Buffer.alloc(32, 1).toString('base64')
    for (const CREDENTIAL_ENCRYPTION_KEYS of ['', `1:${key},1:${key}`, '1:not-base64', `2:${key}`]) {
      expect(() => parseCredentialEncryptionEnv({ ...valid, CREDENTIAL_ENCRYPTION_KEYS })).toThrow()
    }
  })
})
