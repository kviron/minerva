import { expect, it, vi } from 'vitest'
import { ref } from 'vue'

const { getSession, signOut, useSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(),
}))

vi.mock('better-auth/vue', () => ({
  createAuthClient: vi.fn(() => ({ getSession, signOut, useSession })),
}))

const { getIdentitySession, signOutIdentity, useIdentitySession } = await import(
  '../../../../app/features/identity/api/auth-client'
)

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

it('returns the exact reactive session state from Better Auth', () => {
  const sessionState = {
    data: ref(null),
    isPending: ref(true),
    error: ref<unknown>(null),
    refetch: vi.fn(),
  }
  useSession.mockReturnValue(sessionState)

  expect(useIdentitySession()).toBe(sessionState)
})

it.each([null, new Error('logout failed')])(
  'returns only the Better Auth sign-out error %#',
  async (error) => {
    signOut.mockResolvedValue({ data: null, error })

    await expect(signOutIdentity()).resolves.toEqual({ error })
  },
)
