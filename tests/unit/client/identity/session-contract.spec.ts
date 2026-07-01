import { describe, expectTypeOf, it } from 'vitest'
import type {
  IdentitySessionResult,
  IdentitySessionView,
} from '../../../../shared/identity/session'

describe('identity session contract', () => {
  it('accepts the browser-safe user shape used by route access', () => {
    expectTypeOf<{ readonly user: { readonly superAdmin?: boolean } }>()
      .toExtend<IdentitySessionView>()
    expectTypeOf<IdentitySessionView>()
      .toExtend<{ readonly user: { readonly superAdmin?: boolean } }>()
  })

  it('exposes only nullable session data and an unknown error', () => {
    expectTypeOf<IdentitySessionResult>()
      .toEqualTypeOf<{
        readonly data: IdentitySessionView | null
        readonly error: unknown
      }>()
  })
})
