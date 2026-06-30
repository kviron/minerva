import type { H3Event } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { AUTHORIZATION_CODE } from '../../../shared/authorization/constants'
import { createRequireSuperAdmin } from '../../../server/modules/authorization/require-super-admin'

describe('createRequireSuperAdmin', () => {
  it('passes the event to the dependency and returns the exact super administrator session', async () => {
    const event = { headers: new Headers() } as H3Event
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

    await expect(requireSuperAdmin({ headers: new Headers() } as H3Event)).rejects.toMatchObject({
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

    await expect(requireSuperAdmin({ headers: new Headers() } as H3Event)).rejects.toBe(authenticationError)
  })
})
