import { afterEach, expect, it, vi } from 'vitest'
import {
  createIdentityApi,
  identityApi,
  type IdentityRequest,
} from '../../../../app/features/identity/api/identity-api'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('posts identity operations to their exact endpoints with their input bodies', async () => {
  const request = vi.fn<IdentityRequest>(async () => undefined)
  const identityApi = createIdentityApi(request)

  await identityApi.signIn({ identifier: 'minerva', password: 'password' })
  await identityApi.requestPasswordReset({ email: 'minerva@example.com' })
  await identityApi.resetPassword({ token: 'reset-token', newPassword: 'new-password' })

  expect(request.mock.calls).toEqual([
    [
      '/api/identity/sign-in',
      {
        method: 'POST',
        body: { identifier: 'minerva', password: 'password' },
      },
    ],
    [
      '/api/identity/request-password-reset',
      {
        method: 'POST',
        body: { email: 'minerva@example.com' },
      },
    ],
    [
      '/api/identity/reset-password',
      {
        method: 'POST',
        body: { token: 'reset-token', newPassword: 'new-password' },
      },
    ],
  ])
})

it('resolves the runtime fetch lazily when an identity operation runs', async () => {
  const fetch = vi.fn(async () => undefined)
  vi.stubGlobal('$fetch', fetch)

  await identityApi.signIn({ identifier: 'minerva', password: 'password' })

  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    '/api/identity/sign-in',
    {
      method: 'POST',
      body: { identifier: 'minerva', password: 'password' },
    },
  )
})
