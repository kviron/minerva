import type { H3Event } from 'h3'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { getAuth } from './auth'
import { IdentityError } from './errors'

export function createRequireSession<Session>(
  getSession: (headers: Headers) => Promise<Session | null>,
) {
  return async function requireSession(event: H3Event): Promise<Session> {
    const session = await getSession(event.headers)

    if (session === null) {
      throw new IdentityError(IDENTITY_CODE.AUTH_REQUIRED)
    }

    return session
  }
}

export const requireSession = createRequireSession(async headers =>
  await getAuth().api.getSession({ headers }) ?? null,
)
