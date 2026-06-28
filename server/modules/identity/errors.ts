export type IdentityCode =
  | 'INVALID_CREDENTIALS'
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_DISABLED'
  | 'RESET_REQUEST_ACCEPTED'
  | 'RESET_TOKEN_INVALID'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'

const statuses: Record<IdentityCode, number> = {
  INVALID_CREDENTIALS: 401,
  AUTH_REQUIRED: 401,
  ACCOUNT_DISABLED: 403,
  RESET_REQUEST_ACCEPTED: 200,
  RESET_TOKEN_INVALID: 400,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
}

export class IdentityError extends Error {
  readonly statusCode: number

  constructor(public readonly code: IdentityCode) {
    super(code)
    this.name = 'IdentityError'
    this.statusCode = statuses[code]
  }
}
