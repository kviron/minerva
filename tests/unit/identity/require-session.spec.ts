import type { H3Event } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { createRequireSession } from '../../../server/modules/identity/session/require-session'

describe('createRequireSession', () => {
  it('passes the exact event headers and returns the injected session', async () => {
    const headers = new Headers({ cookie: 'session=value' })
    const session = { user: { id: 'user-id' } }
    const getSession = vi.fn().mockResolvedValue(session)
    const requireSession = createRequireSession(getSession)

    const result = await requireSession({ headers, context: {} } as H3Event)

    expect(result).toBe(session)
    expect(getSession).toHaveBeenCalledOnce()
    expect(getSession).toHaveBeenCalledWith(headers)
  })

  it('returns a falsy non-null generic session', async () => {
    const requireSession = createRequireSession(async () => false)

    await expect(requireSession({ headers: new Headers(), context: {} } as H3Event)).resolves.toBe(false)
  })

  it('reuses the exact resolved session on repeated calls for one event', async () => {
    const event = { headers: new Headers(), context: {} } as H3Event
    const session = { user: { id: 'user-id' } }
    const getSession = vi.fn().mockResolvedValue(session)
    const requireSession = createRequireSession(getSession)

    const first = await requireSession(event)
    const second = await requireSession(event)

    expect(first).toBe(session)
    expect(second).toBe(first)
    expect(getSession).toHaveBeenCalledOnce()
  })

  it('resolves sessions independently for distinct events', async () => {
    const firstSession = { user: { id: 'first' } }
    const secondSession = { user: { id: 'second' } }
    const getSession = vi.fn()
      .mockResolvedValueOnce(firstSession)
      .mockResolvedValueOnce(secondSession)
    const requireSession = createRequireSession(getSession)

    await expect(requireSession({ headers: new Headers(), context: {} } as H3Event)).resolves.toBe(firstSession)
    await expect(requireSession({ headers: new Headers(), context: {} } as H3Event)).resolves.toBe(secondSession)
    expect(getSession).toHaveBeenCalledTimes(2)
  })

  it('maps a missing session to the shared authentication-required code', async () => {
    const requireSession = createRequireSession(async () => null)

    const event = { headers: new Headers(), context: {} } as H3Event

    await expect(requireSession(event)).rejects.toMatchObject({
      code: IDENTITY_CODE.AUTH_REQUIRED,
    })
    await expect(requireSession(event)).rejects.toMatchObject({
      code: IDENTITY_CODE.AUTH_REQUIRED,
    })
  })

  it('propagates unexpected resolver errors unchanged and retries them', async () => {
    const error = new Error('resolver failed')
    const getSession = vi.fn().mockRejectedValue(error)
    const requireSession = createRequireSession(getSession)
    const event = { headers: new Headers(), context: {} } as H3Event

    await expect(requireSession(event)).rejects.toBe(error)
    await expect(requireSession(event)).rejects.toBe(error)
    expect(getSession).toHaveBeenCalledTimes(2)
  })
})
