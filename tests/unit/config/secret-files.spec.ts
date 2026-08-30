import { describe, expect, it, vi } from 'vitest'
import {
  resolveSecretFileValues,
  SecretFileConfigurationError,
} from '../../../server/config/secret-files'

const secretKeys = ['DATABASE_URL', 'BETTER_AUTH_SECRET'] as const

describe('resolveSecretFileValues', () => {
  it('returns a new environment projection and resolves a single trailing line ending', () => {
    const input = {
      DATABASE_URL_FILE: '/run/secrets/database_url',
      BETTER_AUTH_SECRET_FILE: '/run/secrets/auth_secret',
      PUBLIC_VALUE: 'kept',
    }
    const readFile = vi.fn((path: string) => path.endsWith('database_url')
      ? 'postgresql://database/minerva\r\n'
      : '01234567890123456789012345678901\n')

    const resolved = resolveSecretFileValues(input, secretKeys, readFile)

    expect(resolved).toEqual({
      ...input,
      DATABASE_URL: 'postgresql://database/minerva',
      BETTER_AUTH_SECRET: '01234567890123456789012345678901',
    })
    expect(input).not.toHaveProperty('DATABASE_URL')
  })

  it('leaves direct development values unchanged without reading files', () => {
    const readFile = vi.fn()
    const input = { DATABASE_URL: 'postgresql://database/minerva' }

    expect(resolveSecretFileValues(input, secretKeys, readFile)).toEqual(input)
    expect(readFile).not.toHaveBeenCalled()
  })

  it.each([
    { DATABASE_URL: 'direct', DATABASE_URL_FILE: '/run/secrets/database_url' },
    { DATABASE_URL_FILE: '' },
  ])('rejects ambiguous or empty file configuration without exposing values', (input) => {
    expect(() => resolveSecretFileValues(input, secretKeys, vi.fn()))
      .toThrow(new SecretFileConfigurationError('DATABASE_URL'))
  })

  it('maps missing and oversized secret files to a content-free error', () => {
    const path = '/private/path/database_url'
    for (const readFile of [
      vi.fn(() => { throw new Error(`missing ${path}`) }),
      vi.fn(() => 's'.repeat(65_537)),
    ]) {
      let caught: unknown
      try {
        resolveSecretFileValues({ DATABASE_URL_FILE: path }, secretKeys, readFile)
      }
      catch (error: unknown) {
        caught = error
      }
      expect(caught).toBeInstanceOf(SecretFileConfigurationError)
      expect(String(caught)).not.toContain(path)
      expect(String(caught)).not.toContain('s'.repeat(32))
    }
  })

  it('does not silently normalize multiple trailing line endings', () => {
    const resolved = resolveSecretFileValues(
      { BETTER_AUTH_SECRET_FILE: '/run/secrets/auth_secret' },
      secretKeys,
      () => 'secret\n\n',
    )

    expect(resolved.BETTER_AUTH_SECRET).toBe('secret\n')
  })
})

