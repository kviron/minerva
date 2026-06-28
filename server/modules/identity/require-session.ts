import type { H3Event } from 'h3'
import { getAuth } from './auth'
import { IdentityError } from './errors'

export async function requireSession(event: H3Event) {
  const session = await getAuth().api.getSession({ headers: event.headers })

  if (!session) {
    throw new IdentityError('AUTH_REQUIRED')
  }

  return session
}
