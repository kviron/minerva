import { APIError } from '@better-auth/core/error'
import { IDENTITY_CODE } from '../../../../shared/identity/constants'
import { getAuth } from '../auth/get-auth'
import { IdentityError } from '../identity-error'
import { consumeIdentityRateLimit, type RateLimitInput } from '../rate-limit'

export interface RecoveryRequest {
  readonly email: string
  readonly ip: string
}

export interface ResetRequest {
  readonly token: string
  readonly newPassword: string
  readonly ip: string
}

export interface PasswordRecoveryDependencies {
  readonly consumeRateLimit: (input: RateLimitInput) => Promise<void>
  readonly requestReset: (email: string) => Promise<void>
  readonly performReset: (input: Readonly<{
    token: string
    newPassword: string
  }>) => Promise<void>
  readonly isProviderError: (error: unknown) => boolean
}

export function createPasswordRecovery(dependencies: PasswordRecoveryDependencies) {
  async function requestPasswordReset(input: RecoveryRequest) {
    const email = input.email.trim().toLowerCase()

    await dependencies.consumeRateLimit({
      scope: 'recovery-request',
      ip: input.ip,
      identity: email,
      max: 3,
      windowSeconds: 60 * 60,
    })

    await dependencies.requestReset(email)
    return IDENTITY_CODE.RESET_REQUEST_ACCEPTED
  }

  async function resetPassword(input: ResetRequest): Promise<void> {
    await dependencies.consumeRateLimit({
      scope: 'password-reset',
      ip: input.ip,
      max: 5,
      windowSeconds: 15 * 60,
    })

    try {
      await dependencies.performReset({
        token: input.token,
        newPassword: input.newPassword,
      })
    } catch (error) {
      if (dependencies.isProviderError(error)) {
        throw new IdentityError(IDENTITY_CODE.RESET_TOKEN_INVALID)
      }
      throw error
    }
  }

  return { requestPasswordReset, resetPassword }
}

const passwordRecovery = createPasswordRecovery({
  consumeRateLimit: consumeIdentityRateLimit,
  async requestReset(email) {
    await getAuth().api.requestPasswordReset({ body: { email } })
  },
  async performReset(input) {
    await getAuth().api.resetPassword({ body: input })
  },
  isProviderError: error => error instanceof APIError,
})

export const requestPasswordReset = passwordRecovery.requestPasswordReset
export const resetPassword = passwordRecovery.resetPassword
