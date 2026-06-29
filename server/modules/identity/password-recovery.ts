import { APIError } from '@better-auth/core/error'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { getAuth } from './auth'
import { IdentityError } from './errors'
import { consumeIdentityRateLimit } from './rate-limit'

export interface RecoveryRequest {
  email: string
  ip: string
}

export interface ResetRequest {
  token: string
  newPassword: string
  ip: string
}

export async function requestPasswordReset(input: RecoveryRequest) {
  const email = input.email.trim().toLowerCase()

  await consumeIdentityRateLimit({
    scope: 'recovery-request',
    ip: input.ip,
    identity: email,
    max: 3,
    windowSeconds: 60 * 60,
  })

  await getAuth().api.requestPasswordReset({ body: { email } })
  return IDENTITY_CODE.RESET_REQUEST_ACCEPTED
}

export async function resetPassword(input: ResetRequest): Promise<void> {
  await consumeIdentityRateLimit({
    scope: 'password-reset',
    ip: input.ip,
    max: 5,
    windowSeconds: 15 * 60,
  })

  try {
    await getAuth().api.resetPassword({
      body: { token: input.token, newPassword: input.newPassword },
    })
  } catch (error) {
    if (error instanceof APIError) {
      throw new IdentityError(IDENTITY_CODE.RESET_TOKEN_INVALID)
    }
    throw error
  }
}
