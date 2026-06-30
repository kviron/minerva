import type { H3Event } from 'h3'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { requireSession } from '../identity/session/require-session'
import { AuthorizationError } from './authorization-error'

interface SuperAdminSession {
  user: {
    superAdmin?: boolean
  }
}

export function createRequireSuperAdmin<Session extends SuperAdminSession>(
  requireAuthenticatedSession: (event: H3Event) => Promise<Session>,
) {
  return async function requireSuperAdmin(event: H3Event): Promise<Session> {
    const session = await requireAuthenticatedSession(event)

    if (session.user.superAdmin !== true) {
      throw new AuthorizationError(AUTHORIZATION_CODE.FORBIDDEN)
    }

    return session
  }
}

export const requireSuperAdmin = createRequireSuperAdmin(requireSession)
