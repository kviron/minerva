import { expect, it, vi } from 'vitest'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('better-auth/vue', () => ({
  createAuthClient: vi.fn(() => ({ getSession })),
}))

const { getIdentitySession } = await import('../../../../app/features/identity/api/auth-client')

it('returns the browser-safe session data and lookup error from Better Auth', async () => {
  const error = new Error('lookup failed')
  const user = {
    id: 'user-42',
    name: 'Алиса',
    email: 'alisa@example.com',
    image: 'https://example.com/alisa.png',
    superAdmin: true,
  }
  getSession.mockResolvedValue({
    data: { user },
    error,
  })

  await expect(getIdentitySession()).resolves.toEqual({
    data: { user },
    error,
  })
})
