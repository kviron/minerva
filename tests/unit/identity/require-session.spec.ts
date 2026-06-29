import type { H3Event } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { createRequireSession } from '../../../server/modules/identity/require-session'

describe('createRequireSession', () => {
  it('passes the exact event headers and returns the injected session', async () => {
    const headers = new Headers({ cookie: 'session=value' })
    const session = { user: { id: 'user-id' } }
    const getSession = vi.fn().mockResolvedValue(session)
    const requireSession = createRequireSession(getSession)

    const result = await requireSession({ headers } as H3Event)

    expect(result).toBe(session)
    expect(getSession).toHaveBeenCalledOnce()
    expect(getSession).toHaveBeenCalledWith(headers)
  })

  it('maps a missing session to the shared authentication-required code', async () => {
    const requireSession = createRequireSession(async () => null)

    await expect(requireSession({ headers: new Headers() } as H3Event)).rejects.toMatchObject({
      code: IDENTITY_CODE.AUTH_REQUIRED,
    })
  })
})
