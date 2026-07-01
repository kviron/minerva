import { expect, it, vi } from 'vitest'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('better-auth/vue', () => ({
  createAuthClient: vi.fn(() => ({ getSession })),
}))

const { getIdentitySession } = await import('../../../../app/features/identity/api/auth-client')

it('returns the browser-safe session data and lookup error from Better Auth', async () => {
  const error = new Error('lookup failed')
  getSession.mockResolvedValue({
    data: { user: { superAdmin: true } },
    error,
  })

  await expect(getIdentitySession()).resolves.toEqual({
    data: { user: { superAdmin: true } },
    error,
  })
})
