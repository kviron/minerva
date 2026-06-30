import type { H3Event } from 'h3'
import { defineEventHandler, getMethod, getRequestURL, setResponseStatus } from 'h3'
import { AuthorizationError } from '../modules/authorization/authorization-error'
import { classifyApiAccess } from '../modules/authorization/api-access'
import { requireSuperAdmin } from '../modules/authorization/require-super-admin'
import { requireSession } from '../modules/identity/session/require-session'
import { IdentityError } from '../modules/identity/identity-error'

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

export function createAuthorizeApiHandler(authorizeApi: (event: H3Event) => Promise<void>) {
  return async function authorizeApiHandler(event: H3Event) {
    try {
      await authorizeApi(event)
    } catch (error) {
      if (error instanceof IdentityError || error instanceof AuthorizationError) {
        setResponseStatus(event, error.statusCode)
        return { data: { code: error.code } }
      }

      throw error
    }
  }
}

export default defineEventHandler(createAuthorizeApiHandler(
  createAuthorizeApi({ requireSession, requireSuperAdmin }),
))
