import { APIError } from '@better-auth/core/error'
import { IDENTITY_CODE, LOGIN_IDENTIFIER_KIND } from '../../../shared/identity/constants'
import { getAuth } from './auth'
import { IdentityError } from './errors'
import { classifyLoginIdentifier } from './identifier'
import { consumeIdentityRateLimit } from './rate-limit'

export interface SignInInput {
  readonly identifier: string
  readonly password: string
  readonly ip: string
  readonly requestHeaders: Headers
}

export interface ProviderSignInInput {
  readonly identifier: string
  readonly password: string
  readonly requestHeaders: Headers
}

export interface SignInDependencies {
  readonly consumeRateLimit: typeof consumeIdentityRateLimit
  readonly signInEmail: (input: ProviderSignInInput) => Promise<{ headers: Headers }>
  readonly signInUsername: (input: ProviderSignInInput) => Promise<{ headers: Headers }>
  readonly isProviderError: (error: unknown) => boolean
}

export function createSignInWithIdentifier(dependencies: SignInDependencies) {
  return async function signIn(input: SignInInput): Promise<{ headers: Headers }> {
    const classified = classifyLoginIdentifier(input.identifier)
    if (!classified.ok) throw new IdentityError(classified.code)

    const identifier = classified.value

    await dependencies.consumeRateLimit({
      scope: 'sign-in',
      ip: input.ip,
      identity: identifier.normalized,
      max: 5,
      windowSeconds: 15 * 60,
    })

    try {
      const capability = identifier.kind === LOGIN_IDENTIFIER_KIND.EMAIL
        ? dependencies.signInEmail
        : dependencies.signInUsername

      return await capability({
        identifier: identifier.normalized,
        password: input.password,
        requestHeaders: input.requestHeaders,
      })
    } catch (error) {
      if (dependencies.isProviderError(error)) {
        throw new IdentityError(IDENTITY_CODE.INVALID_CREDENTIALS)
      }
      throw error
    }
  }
}

export const signInWithIdentifier = createSignInWithIdentifier({
  consumeRateLimit: consumeIdentityRateLimit,
  async signInEmail(input) {
    const result = await getAuth().api.signInEmail({
      body: { email: input.identifier, password: input.password },
      headers: input.requestHeaders,
      returnHeaders: true,
    })
    return { headers: result.headers }
  },
  async signInUsername(input) {
    const result = await getAuth().api.signInUsername({
      body: { username: input.identifier, password: input.password },
      headers: input.requestHeaders,
      returnHeaders: true,
    })
    return { headers: result.headers }
  },
  isProviderError: error => error instanceof APIError,
})
