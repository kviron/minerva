import type { H3Event } from 'h3'
import { createEvent } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { createAuthorizeApi, createAuthorizeApiHandler } from '../../../server/middleware/authorize-api'
import { AuthorizationError } from '../../../server/modules/authorization/authorization-error'
import { API_ACCESS } from '../../../server/modules/authorization/api-access'
import { IdentityError } from '../../../server/modules/identity/identity-error'

function event(method: string, url: string): H3Event {
  return createEvent({ method, url, headers: {} } as never, {} as never)
}

describe('createAuthorizeApi', () => {
  it.each([
    ['POST', '/api/identity/sign-in'],
    ['GET', '/app'],
  ])('does not invoke guards for %s %s', async (method, url) => {
    const requireSession = vi.fn()
    const requireSuperAdmin = vi.fn()
    const authorizeApi = createAuthorizeApi({ requireSession, requireSuperAdmin })

    await authorizeApi(event(method, url))

    expect(requireSession).not.toHaveBeenCalled()
    expect(requireSuperAdmin).not.toHaveBeenCalled()
  })

  it('invokes only the session guard for authenticated APIs', async () => {
    const apiEvent = event('GET', '/api/mainMenu?locale=ru')
    const requireSession = vi.fn()
    const requireSuperAdmin = vi.fn()
    const authorizeApi = createAuthorizeApi({ requireSession, requireSuperAdmin })

    await authorizeApi(apiEvent)

    expect(requireSession).toHaveBeenCalledOnce()
    expect(requireSession).toHaveBeenCalledWith(apiEvent)
    expect(requireSuperAdmin).not.toHaveBeenCalled()
  })

  it('invokes only the super-admin guard for administration APIs', async () => {
    const apiEvent = event('DELETE', '/api/administration/users/1')
    const requireSession = vi.fn()
    const requireSuperAdmin = vi.fn()
    const authorizeApi = createAuthorizeApi({ requireSession, requireSuperAdmin })

    await authorizeApi(apiEvent)

    expect(requireSession).not.toHaveBeenCalled()
    expect(requireSuperAdmin).toHaveBeenCalledOnce()
    expect(requireSuperAdmin).toHaveBeenCalledWith(apiEvent)
  })

  it.each([API_ACCESS.AUTHENTICATED, API_ACCESS.SUPER_ADMIN])('propagates %s guard errors unchanged', async (access) => {
    const error = new Error('guard failed')
    const requireSession = vi.fn().mockRejectedValue(error)
    const requireSuperAdmin = vi.fn().mockRejectedValue(error)
    const authorizeApi = createAuthorizeApi({ requireSession, requireSuperAdmin })
    const apiEvent = event('GET', access === API_ACCESS.AUTHENTICATED ? '/api/future' : '/api/administration')

    await expect(authorizeApi(apiEvent)).rejects.toBe(error)
  })
})

describe('createAuthorizeApiHandler', () => {
  it.each([
    [new IdentityError(IDENTITY_CODE.AUTH_REQUIRED), 401, IDENTITY_CODE.AUTH_REQUIRED],
    [new AuthorizationError(AUTHORIZATION_CODE.FORBIDDEN), 403, AUTHORIZATION_CODE.FORBIDDEN],
  ])('maps a known guard error to a safe response body', async (error, status, code) => {
    const apiEvent = event('GET', '/api/mainMenu')
    const authorizeApi = vi.fn().mockRejectedValue(error)
    const handler = createAuthorizeApiHandler(authorizeApi)

    await expect(handler(apiEvent)).resolves.toEqual({
      data: { code },
    })
    expect(apiEvent.node.res.statusCode).toBe(status)
  })

  it('rethrows an arbitrary error by identity', async () => {
    const error = new Error('unexpected')
    const handler = createAuthorizeApiHandler(vi.fn().mockRejectedValue(error))

    await expect(handler(event('GET', '/api/mainMenu'))).rejects.toBe(error)
  })
})
