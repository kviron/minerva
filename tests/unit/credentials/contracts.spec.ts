import { describe, expect, expectTypeOf, it } from 'vitest'
import { CREDENTIAL_FIELD_TYPE } from '../../../shared/credentials/constants'
import type { CredentialFieldType } from '../../../shared/credentials/types'

describe('credential closed sets', () => {
  it('defines the approved dynamic field types', () => {
    expect(CREDENTIAL_FIELD_TYPE).toEqual({
      TEXT: 'text',
      SECRET: 'secret',
      URL: 'url',
      NOTE: 'note',
    })
    expectTypeOf(CREDENTIAL_FIELD_TYPE.SECRET).toEqualTypeOf<CredentialFieldType>()
  })
})
