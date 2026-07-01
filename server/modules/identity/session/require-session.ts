import type { H3Event } from 'h3'
import { IDENTITY_CODE } from '../../../../shared/identity/constants'
import { getAuth } from '../auth/get-auth'
import { IdentityError } from '../identity-error'

const requestSessionKey: unique symbol = Symbol('minerva.requestSession')

export function createRequireSession<Session>(
  getSession: (headers: Headers) => Promise<Session | null>,
) {
  return async function requireSession(event: H3Event): Promise<Session> {
    const context = event.context as Record<PropertyKey, unknown>

    if (Object.prototype.hasOwnProperty.call(context, requestSessionKey)) {
      return context[requestSessionKey] as Session
    }

    const session = await getSession(event.headers)

    if (session === null) {
      throw new IdentityError(IDENTITY_CODE.AUTH_REQUIRED)
    }

    context[requestSessionKey] = session
    return session
  }
}

export const requireSession = createRequireSession(async headers =>
  await getAuth().api.getSession({ headers }) ?? null,
)
