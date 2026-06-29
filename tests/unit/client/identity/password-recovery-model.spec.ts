import { expect, it, vi } from 'vitest'
import {
  createPasswordRecoveryAction,
  RECOVERY_ERROR_MESSAGE,
  RECOVERY_SUCCESS_MESSAGE,
} from '../../../../app/features/identity/model/use-password-recovery-form'

it('returns the enumeration-safe success message', async () => {
  const requestPasswordReset = vi.fn().mockResolvedValue(undefined)
  const action = createPasswordRecoveryAction({ requestPasswordReset })

  await expect(action({ email: 'user@example.com' })).resolves.toEqual({
    status: RECOVERY_SUCCESS_MESSAGE,
    error: '',
  })
})

it('returns the existing delivery failure message', async () => {
  const action = createPasswordRecoveryAction({
    requestPasswordReset: vi.fn().mockRejectedValue(new Error('network')),
  })

  await expect(action({ email: 'user@example.com' })).resolves.toEqual({
    status: '',
    error: RECOVERY_ERROR_MESSAGE,
  })
})
