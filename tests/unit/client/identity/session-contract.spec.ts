import { describe, expectTypeOf, it } from 'vitest'
import type {
  IdentitySessionResult,
  IdentitySessionUserView,
  IdentitySessionView,
} from '../../../../shared/identity/session'

describe('identity session contract', () => {
  it('exposes the full browser-safe user shape', () => {
    expectTypeOf<IdentitySessionUserView>()
      .toEqualTypeOf<{
        readonly id: string
        readonly name: string
        readonly email: string
        readonly image?: string | null
        readonly superAdmin?: boolean
      }>()
    expectTypeOf<IdentitySessionView['user']>()
      .toEqualTypeOf<IdentitySessionUserView>()
  })

  it('exposes only nullable session data and an unknown error', () => {
    expectTypeOf<IdentitySessionResult>()
      .toEqualTypeOf<{
        readonly data: IdentitySessionView | null
        readonly error: unknown
      }>()
  })
})
