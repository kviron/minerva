import type { H3Event } from 'h3'
import { defineEventHandler, getMethod, getRequestURL } from 'h3'
import { classifyApiAccess } from '../modules/authorization/api-access'
import { requireSuperAdmin } from '../modules/authorization/require-super-admin'
import { requireSession } from '../modules/identity/session/require-session'

interface AuthorizeApiDependencies {
  requireSession: (event: H3Event) => Promise<unknown>
  requireSuperAdmin: (event: H3Event) => Promise<unknown>
}

export function createAuthorizeApi(dependencies: AuthorizeApiDependencies) {
  return async function authorizeApi(event: H3Event): Promise<void> {
    const access = classifyApiAccess(getMethod(event), getRequestURL(event).pathname)

    if (access === 'authenticated') {
      await dependencies.requireSession(event)
    } else if (access === 'super-admin') {
      await dependencies.requireSuperAdmin(event)
    }
  }
}

export default defineEventHandler(createAuthorizeApi({ requireSession, requireSuperAdmin }))
