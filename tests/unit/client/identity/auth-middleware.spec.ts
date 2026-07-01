import { readFile } from 'node:fs/promises'
import { beforeEach, expect, it, vi } from 'vitest'

const { getIdentitySession, navigateTo, createError, abortNavigation } = vi.hoisted(() => ({
  getIdentitySession: vi.fn(),
  navigateTo: vi.fn(),
  createError: vi.fn(options => ({ ...options, name: 'NuxtError' })),
  abortNavigation: vi.fn(error => ({ aborted: error })),
}))

vi.mock('@/features/identity', async () => {
  const { decideRouteAccess } = await import('../../../../app/features/identity/model/route-access')
  return { decideRouteAccess, getIdentitySession }
})

vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: unknown) => middleware)
vi.stubGlobal('navigateTo', navigateTo)
vi.stubGlobal('createError', createError)
vi.stubGlobal('abortNavigation', abortNavigation)

const { default: authMiddleware } = await import('../../../../app/middleware/auth.global')

beforeEach(() => {
  vi.clearAllMocks()
})

it('passes the adapter session to route access without asserting its type', async () => {
  const source = await readFile(
    new URL('../../../../app/middleware/auth.global.ts', import.meta.url),
    'utf8',
  )

  expect(source).not.toMatch(/session\s+as\s+/)
  expect(source).not.toContain('RouteSession')
})

it('allows navigation when the resolved session may access the route', async () => {
  getIdentitySession.mockResolvedValue({
    data: { user: { superAdmin: false } },
    error: null,
  })

  await expect(authMiddleware({ path: '/projects' } as never, {} as never))
    .resolves.toBeUndefined()
  expect(navigateTo).not.toHaveBeenCalled()
  expect(abortNavigation).not.toHaveBeenCalled()
})

it('returns the Nuxt redirect produced by the route policy', async () => {
  const redirect = { redirected: true }
  navigateTo.mockReturnValue(redirect)
  getIdentitySession.mockResolvedValue({ data: null, error: null })

  await expect(authMiddleware({ path: '/projects' } as never, {} as never))
    .resolves.toBe(redirect)
  expect(navigateTo).toHaveBeenCalledWith('/auth')
})

it('maps a session lookup error to a 503 Nuxt navigation abort', async () => {
  const sessionError = new Error('network')
  getIdentitySession.mockResolvedValue({ data: null, error: sessionError })

  const result = await authMiddleware({ path: '/projects' } as never, {} as never)

  expect(createError).toHaveBeenCalledWith({
    statusCode: 503,
    statusMessage: 'Service Unavailable',
  })
  expect(abortNavigation).toHaveBeenCalledWith({
    statusCode: 503,
    statusMessage: 'Service Unavailable',
    name: 'NuxtError',
  })
  expect(result).toEqual({
    aborted: {
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      name: 'NuxtError',
    },
  })
  expect(navigateTo).not.toHaveBeenCalled()
})
