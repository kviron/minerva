import { IDENTITY_CODE } from '../../../shared/identity/constants'
import type { IdentityCode } from '../../../shared/identity/types'

const statuses = {
  [IDENTITY_CODE.INVALID_CREDENTIALS]: 401,
  [IDENTITY_CODE.AUTH_REQUIRED]: 401,
  [IDENTITY_CODE.ACCOUNT_DISABLED]: 403,
  [IDENTITY_CODE.RESET_REQUEST_ACCEPTED]: 200,
  [IDENTITY_CODE.RESET_TOKEN_INVALID]: 400,
  [IDENTITY_CODE.RATE_LIMITED]: 429,
  [IDENTITY_CODE.SERVICE_UNAVAILABLE]: 503,
} satisfies Record<IdentityCode, number>

export class IdentityError extends Error {
  readonly statusCode: number

  constructor(public readonly code: IdentityCode) {
    super(code)
    this.name = 'IdentityError'
    this.statusCode = statuses[code]
  }
}
