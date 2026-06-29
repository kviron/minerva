import { describe, expect, it } from 'vitest'
import { IDENTITY_CODE, LOGIN_IDENTIFIER_KIND } from '../../../shared/identity/constants'
import { classifyLoginIdentifier } from '../../../server/modules/identity/identifier'

describe('classifyLoginIdentifier', () => {
  it('normalizes an email identifier', () => {
    expect(classifyLoginIdentifier(' User@Example.com ')).toEqual({
      ok: true,
      value: {
        kind: LOGIN_IDENTIFIER_KIND.EMAIL,
        normalized: 'user@example.com',
      },
    })
  })

  it('normalizes a username identifier', () => {
    expect(classifyLoginIdentifier(' Test.User ')).toEqual({
      ok: true,
      value: {
        kind: LOGIN_IDENTIFIER_KIND.USERNAME,
        normalized: 'test.user',
      },
    })
  })

  it.each(['', 'x'.repeat(256)])('rejects an unsupported identifier', (identifier) => {
    expect(classifyLoginIdentifier(identifier)).toEqual({
      ok: false,
      code: IDENTITY_CODE.INVALID_CREDENTIALS,
    })
  })
})
