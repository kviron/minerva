import { describe, expect, it } from 'vitest'
import { classifyLoginIdentifier } from '../../../server/modules/identity/identifier'

describe('classifyLoginIdentifier', () => {
  it('normalizes an email identifier', () => {
    expect(classifyLoginIdentifier(' User@Example.com ')).toEqual({
      kind: 'email',
      normalized: 'user@example.com',
    })
  })

  it('normalizes a username identifier', () => {
    expect(classifyLoginIdentifier(' Test.User ')).toEqual({
      kind: 'username',
      normalized: 'test.user',
    })
  })

  it.each(['', 'x'.repeat(256)])('rejects an unsupported identifier', (identifier) => {
    expect(() => classifyLoginIdentifier(identifier)).toThrowError(
      expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
    )
  })
})
