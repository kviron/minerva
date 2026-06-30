import type { AuthorizationCode } from '../../../shared/authorization/types'

export class AuthorizationError extends Error {
  readonly statusCode = 403

  constructor(public readonly code: AuthorizationCode) {
    super(code)
    this.name = 'AuthorizationError'
  }
}
