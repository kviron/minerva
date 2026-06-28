import { APIError } from '@better-auth/core/error'
import { getAuth } from './auth'
import { IdentityError } from './errors'
import { classifyLoginIdentifier } from './identifier'
import { consumeIdentityRateLimit } from './rate-limit'

export interface SignInInput {
  identifier: string
  password: string
  ip: string
  requestHeaders: Headers
}

export async function signInWithIdentifier(input: SignInInput): Promise<{ headers: Headers }> {
  const identifier = classifyLoginIdentifier(input.identifier)

  await consumeIdentityRateLimit({
    scope: 'sign-in',
    ip: input.ip,
    identity: identifier.normalized,
    max: 5,
    windowSeconds: 15 * 60,
  })

  try {
    const auth = getAuth()
    const result = identifier.kind === 'email'
      ? await auth.api.signInEmail({
          body: { email: identifier.normalized, password: input.password },
          headers: input.requestHeaders,
          returnHeaders: true,
        })
      : await auth.api.signInUsername({
          body: { username: identifier.normalized, password: input.password },
          headers: input.requestHeaders,
          returnHeaders: true,
        })

    return { headers: result.headers }
  } catch (error) {
    if (error instanceof APIError) {
      throw new IdentityError('INVALID_CREDENTIALS')
    }
    throw error
  }
}
