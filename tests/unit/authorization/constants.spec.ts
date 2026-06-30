import { describe, expect, expectTypeOf, it } from 'vitest'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import type { AuthorizationCode } from '../../../shared/authorization/types'

describe('authorization constants', () => {
  it('exposes the global forbidden code', () => {
    expect(AUTHORIZATION_CODE.FORBIDDEN).toBe('FORBIDDEN')
    expectTypeOf(AUTHORIZATION_CODE.FORBIDDEN).toEqualTypeOf<AuthorizationCode>()
  })
})
