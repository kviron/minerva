import { expect, it, vi } from 'vitest'
import { isRef, ref } from 'vue'
import { readFile } from 'node:fs/promises'

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

it('infers additional session fields through the supported Better Auth client plugin', async () => {
  const source = await readFile('app/features/identity/api/auth-client.ts', 'utf8')

  expect(source).toContain('inferAdditionalFields<ReturnType<typeof createMinervaAuth>>()')
  expect(source).not.toContain('as IdentitySessionView')
})

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

it('adapts the Better Auth session ref to public field refs', () => {
  const error = new Error('lookup failed')
  useSession.mockReturnValue(ref({
    data: null,
    isPending: true,
    isRefetching: false,
    error,
    refetch: vi.fn(),
  }))

  const session = useIdentitySession()

  expect(isRef(session.data)).toBe(true)
  expect(isRef(session.isPending)).toBe(true)
  expect(isRef(session.error)).toBe(true)
  expect(session.data.value).toBeNull()
  expect(session.isPending.value).toBe(true)
  expect(session.error.value).toBe(error)
})

it('reflects replacement of the Better Auth session state', () => {
  const source = ref({
    data: null as null | { user: { id: string; name: string; email: string } },
    isPending: true,
    isRefetching: false,
    error: null as unknown,
    refetch: vi.fn(),
  })
  useSession.mockReturnValue(source)
  const session = useIdentitySession()
  const data = {
    user: { id: 'user-42', name: 'Алиса', email: 'alisa@example.com' },
  }
  const error = new Error('replacement error')

  source.value = {
    data,
    isPending: false,
    isRefetching: false,
    error,
    refetch: vi.fn(),
  }

  expect(session.data.value).toEqual(data)
  expect(session.isPending.value).toBe(false)
  expect(session.error.value).toBe(error)
})

it('delegates refetch to the current Better Auth session state', async () => {
  const refetch = vi.fn().mockResolvedValue('refetched')
  const source = ref({
    data: null,
    isPending: false,
    isRefetching: false,
    error: null,
    refetch: vi.fn(),
  })
  useSession.mockReturnValue(source)
  const session = useIdentitySession()
  source.value = { ...source.value, refetch }

  await expect(session.refetch()).resolves.toBe('refetched')
  expect(refetch).toHaveBeenCalledOnce()
})

it.each([null, new Error('logout failed')])(
  'returns only the Better Auth sign-out error %#',
  async (error) => {
    signOut.mockResolvedValue({ data: null, error })

    await expect(signOutIdentity()).resolves.toEqual({ error })
  },
)
