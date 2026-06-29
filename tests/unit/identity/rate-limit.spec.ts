import { describe, expect, it } from 'vitest'
import { createRateLimitKey } from '../../../server/modules/identity/rate-limit'

describe('createRateLimitKey', () => {
  it('creates a stable opaque key', () => {
    const secret = 'test-rate-limit-secret'
    const input = {
      scope: 'sign-in' as const,
      ip: '192.0.2.1',
      identity: 'user@example.com',
    }

    const firstKey = createRateLimitKey(secret, input)
    const secondKey = createRateLimitKey(secret, input)

    expect(firstKey).toBe(secondKey)
    expect(firstKey).toMatch(/^[0-9a-f]{64}$/)
    expect(firstKey).not.toContain(input.identity)
  })
})
