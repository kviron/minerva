import type { H3Event } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { createRequireSuperAdmin } from '../../../server/modules/authorization/require-super-admin'
import { createRequireSession } from '../../../server/modules/identity/session/require-session'

describe('createRequireSuperAdmin', () => {
  it('passes the event to the dependency and returns the exact super administrator session', async () => {
    const event = { headers: new Headers(), context: {} } as H3Event
    const session = { user: { superAdmin: true } }
    const requireSession = vi.fn().mockResolvedValue(session)
    const requireSuperAdmin = createRequireSuperAdmin(requireSession)

    const result = await requireSuperAdmin(event)

    expect(result).toBe(session)
    expect(requireSession).toHaveBeenCalledOnce()
    expect(requireSession).toHaveBeenCalledWith(event)
  })

  it.each([
    ['false', false],
    ['missing', undefined],
    ['a non-true value', 'true'],
  ])('rejects %s superAdmin with the forbidden authorization error', async (_label, superAdmin) => {
    const session = { user: { superAdmin } } as unknown as { user: { superAdmin?: boolean } }
    const requireSuperAdmin = createRequireSuperAdmin(async () => session)

    await expect(requireSuperAdmin({ headers: new Headers(), context: {} } as H3Event)).rejects.toMatchObject({
      name: 'AuthorizationError',
      code: AUTHORIZATION_CODE.FORBIDDEN,
      statusCode: 403,
    })
  })

  it('propagates injected authentication errors unchanged', async () => {
    const authenticationError = new Error('authentication failed')
    const requireSuperAdmin = createRequireSuperAdmin(async () => {
      throw authenticationError
    })

    await expect(requireSuperAdmin({ headers: new Headers(), context: {} } as H3Event)).rejects.toBe(authenticationError)
  })

  it('reuses a session previously required on the same event and still requires strict true', async () => {
    const event = { headers: new Headers(), context: {} } as H3Event
    const session = { user: { superAdmin: false } }
    const getSession = vi.fn().mockResolvedValue(session)
    const requireSession = createRequireSession(getSession)
    const requireSuperAdmin = createRequireSuperAdmin(requireSession)

    await expect(requireSession(event)).resolves.toBe(session)
    await expect(requireSuperAdmin(event)).rejects.toMatchObject({
      code: AUTHORIZATION_CODE.FORBIDDEN,
    })
    expect(getSession).toHaveBeenCalledOnce()
  })
})
