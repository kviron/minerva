import { describe, expect, it, vi } from 'vitest'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { createSignInWithIdentifier } from '../../../server/modules/identity/sign-in'

const input = (identifier: string) => ({
  identifier,
  password: 'secret',
  ip: '127.0.0.1',
  requestHeaders: new Headers({ cookie: 'locale=ru' }),
})

describe('createSignInWithIdentifier', () => {
  it('selects the email capability after normalization and preserves headers', async () => {
    const headers = new Headers({ 'set-cookie': 'session=value' })
    const consumeRateLimit = vi.fn().mockResolvedValue(undefined)
    const signInEmail = vi.fn().mockResolvedValue({ headers })
    const signInUsername = vi.fn()
    const signIn = createSignInWithIdentifier({
      consumeRateLimit,
      signInEmail,
      signInUsername,
      isProviderError: () => false,
    })
    const signInInput = input(' User@Example.com ')

    const result = await signIn(signInInput)

    expect(result.headers).toBe(headers)
    expect(signInEmail).toHaveBeenCalledWith({
      identifier: 'user@example.com',
      password: signInInput.password,
      requestHeaders: signInInput.requestHeaders,
    })
    expect(signInUsername).not.toHaveBeenCalled()
    expect(consumeRateLimit).toHaveBeenCalledOnce()
    expect(consumeRateLimit).toHaveBeenCalledWith({
      scope: 'sign-in',
      ip: signInInput.ip,
      identity: 'user@example.com',
      max: 5,
      windowSeconds: 15 * 60,
    })
  })

  it('selects the username capability after normalization', async () => {
    const headers = new Headers()
    const signInEmail = vi.fn()
    const signInUsername = vi.fn().mockResolvedValue({ headers })
    const signIn = createSignInWithIdentifier({
      consumeRateLimit: vi.fn().mockResolvedValue(undefined),
      signInEmail,
      signInUsername,
      isProviderError: () => false,
    })

    await signIn(input(' Test.User '))

    expect(signInEmail).not.toHaveBeenCalled()
    expect(signInUsername).toHaveBeenCalledWith(expect.objectContaining({
      identifier: 'test.user',
    }))
  })

  it('maps provider credential failures to the stable identity code', async () => {
    const providerError = new Error('provider')
    const signIn = createSignInWithIdentifier({
      consumeRateLimit: vi.fn().mockResolvedValue(undefined),
      signInEmail: vi.fn().mockRejectedValue(providerError),
      signInUsername: vi.fn(),
      isProviderError: error => error === providerError,
    })

    await expect(signIn(input('user@example.com'))).rejects.toMatchObject({
      code: IDENTITY_CODE.INVALID_CREDENTIALS,
    })
  })

  it('rethrows unknown provider failures unchanged', async () => {
    const unknownError = new Error('database unavailable')
    const signIn = createSignInWithIdentifier({
      consumeRateLimit: vi.fn().mockResolvedValue(undefined),
      signInEmail: vi.fn().mockRejectedValue(unknownError),
      signInUsername: vi.fn(),
      isProviderError: () => false,
    })

    await expect(signIn(input('user@example.com'))).rejects.toBe(unknownError)
  })
})
