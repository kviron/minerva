import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_STATUS,
  AUTH_MODE,
  IDENTITY_CODE,
  LOGIN_IDENTIFIER_KIND,
} from '../../../shared/identity/constants'
import type {
  AccountStatus,
  AuthMode,
  IdentityCode,
  LoginIdentifierKind,
} from '../../../shared/identity/types'

describe('identity constants', () => {
  it('exposes the exact account status vocabulary', () => {
    expect(ACCOUNT_STATUS).toEqual({
      ACTIVE: 'active',
      DISABLED: 'disabled',
    })
  })

  it('provides runtime values assignable to the derived types', () => {
    const accountStatus: AccountStatus = ACCOUNT_STATUS.ACTIVE
    const authMode: AuthMode = AUTH_MODE.RUNTIME
    const identityCode: IdentityCode = IDENTITY_CODE.AUTH_REQUIRED
    const identifierKind: LoginIdentifierKind = LOGIN_IDENTIFIER_KIND.EMAIL

    expect({ accountStatus, authMode, identityCode, identifierKind }).toEqual({
      accountStatus: 'active',
      authMode: 'runtime',
      identityCode: 'AUTH_REQUIRED',
      identifierKind: 'email',
    })
  })
})
