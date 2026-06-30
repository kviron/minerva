import type { H3Event } from 'h3'
import { createEvent } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { createAuthorizeApi } from '../../../server/middleware/authorize-api'

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

  it.each(['authenticated', 'super-admin'] as const)('propagates %s guard errors unchanged', async (access) => {
    const error = new Error('guard failed')
    const requireSession = vi.fn().mockRejectedValue(error)
    const requireSuperAdmin = vi.fn().mockRejectedValue(error)
    const authorizeApi = createAuthorizeApi({ requireSession, requireSuperAdmin })
    const apiEvent = event('GET', access === 'authenticated' ? '/api/future' : '/api/administration')

    await expect(authorizeApi(apiEvent)).rejects.toBe(error)
  })
})
