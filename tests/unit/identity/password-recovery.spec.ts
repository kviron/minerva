import { describe, expect, it, vi } from 'vitest'
import { IDENTITY_CODE } from '../../../shared/identity/constants'
import { createPasswordRecovery } from '../../../server/modules/identity/password-recovery'

const recoveryInput = (email: string) => ({ email, ip: '127.0.0.1' })
const resetInput = { token: 'private-reset-token', newPassword: 'new-secret', ip: '127.0.0.2' }

describe('createPasswordRecovery', () => {
  it('normalizes recovery email for rate limiting and the provider', async () => {
    const consumeRateLimit = vi.fn().mockResolvedValue(undefined)
    const requestReset = vi.fn().mockResolvedValue(undefined)
    const recovery = createPasswordRecovery({
      consumeRateLimit,
      requestReset,
      performReset: vi.fn(),
      isProviderError: () => false,
    })

    const result = await recovery.requestPasswordReset(recoveryInput(' User@Example.com '))

    expect(result).toBe(IDENTITY_CODE.RESET_REQUEST_ACCEPTED)
    expect(consumeRateLimit).toHaveBeenCalledWith({
      scope: 'recovery-request',
      ip: '127.0.0.1',
      identity: 'user@example.com',
      max: 3,
      windowSeconds: 60 * 60,
    })
    expect(requestReset).toHaveBeenCalledWith('user@example.com')
  })

  it('returns the same shared response for known and unknown-style recovery inputs', async () => {
    const recovery = createPasswordRecovery({
      consumeRateLimit: vi.fn().mockResolvedValue(undefined),
      requestReset: vi.fn().mockResolvedValue(undefined),
      performReset: vi.fn(),
      isProviderError: () => false,
    })

    const known = await recovery.requestPasswordReset(recoveryInput('known@example.com'))
    const unknown = await recovery.requestPasswordReset(recoveryInput('missing@example.com'))

    expect(known).toBe(IDENTITY_CODE.RESET_REQUEST_ACCEPTED)
    expect(unknown).toBe(IDENTITY_CODE.RESET_REQUEST_ACCEPTED)
  })

  it('rate limits reset attempts and passes the token and new password to the provider', async () => {
    const consumeRateLimit = vi.fn().mockResolvedValue(undefined)
    const performReset = vi.fn().mockResolvedValue(undefined)
    const recovery = createPasswordRecovery({
      consumeRateLimit,
      requestReset: vi.fn(),
      performReset,
      isProviderError: () => false,
    })

    await recovery.resetPassword(resetInput)

    expect(consumeRateLimit).toHaveBeenCalledWith({
      scope: 'password-reset',
      ip: resetInput.ip,
      max: 5,
      windowSeconds: 15 * 60,
    })
    expect(performReset).toHaveBeenCalledWith({
      token: resetInput.token,
      newPassword: resetInput.newPassword,
    })
  })

  it('maps recognized provider reset failures to the stable invalid-token code', async () => {
    const providerError = new Error('provider rejected token')
    const recovery = createPasswordRecovery({
      consumeRateLimit: vi.fn().mockResolvedValue(undefined),
      requestReset: vi.fn(),
      performReset: vi.fn().mockRejectedValue(providerError),
      isProviderError: error => error === providerError,
    })

    await expect(recovery.resetPassword(resetInput)).rejects.toMatchObject({
      code: IDENTITY_CODE.RESET_TOKEN_INVALID,
    })
  })

  it('rethrows unknown reset failures unchanged', async () => {
    const unknownError = new Error('database unavailable')
    const recovery = createPasswordRecovery({
      consumeRateLimit: vi.fn().mockResolvedValue(undefined),
      requestReset: vi.fn(),
      performReset: vi.fn().mockRejectedValue(unknownError),
      isProviderError: () => false,
    })

    await expect(recovery.resetPassword(resetInput)).rejects.toBe(unknownError)
  })
})
