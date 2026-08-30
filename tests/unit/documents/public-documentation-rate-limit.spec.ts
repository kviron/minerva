import { describe, expect, it, vi } from 'vitest'
import { createPublicDocumentationFailureRateLimit } from '../../../server/modules/documents/public-documentation-rate-limit'

describe('public documentation invalid-request rate limit', () => {
  it('uses only an HMAC of the IP and stops after the bounded failure count', async () => {
    let count = 0
    const increment = vi.fn(async () => ++count)
    const consume = createPublicDocumentationFailureRateLimit({
      secret: () => 'rate-limit-secret-with-at-least-32-bytes',
      now: () => 100,
      increment,
    })
    for (let index = 0; index < 30; index += 1) {
      await expect(consume({ ip: '203.0.113.7' })).resolves.toBe(true)
    }
    await expect(consume({ ip: '203.0.113.7' })).resolves.toBe(false)
    const firstKey = increment.mock.calls[0]?.[0]
    expect(firstKey).toMatch(/^[0-9a-f]{64}$/u)
    expect(firstKey).not.toContain('203.0.113.7')
    expect(increment).toHaveBeenLastCalledWith(firstKey, 100, 60)
  })
})
