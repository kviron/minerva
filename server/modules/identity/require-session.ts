import type { H3Event } from 'h3'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { getAuth } from './auth'
import { IdentityError } from './errors'

export async function requireSession(event: H3Event) {
  const session = await getAuth().api.getSession({ headers: event.headers })

  if (!session) {
    throw new IdentityError(IDENTITY_CODE.AUTH_REQUIRED)
  }

  return session
}
