import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h } from 'vue'
import { expect, it, vi } from 'vitest'
import {
  createPasswordRecoveryAction,
  RECOVERY_ERROR_MESSAGE,
  RECOVERY_SUCCESS_MESSAGE,
  usePasswordRecoveryForm,
} from '../../../../app/features/identity/model/use-password-recovery-form'
import { RECOVERY_EMAIL_ERROR } from '../../../../app/features/identity/model/schemas'

type PasswordRecoveryDependencies = Parameters<typeof usePasswordRecoveryForm>[0]
type PasswordRecoveryForm = ReturnType<typeof usePasswordRecoveryForm>

async function createForm(
  dependencies: PasswordRecoveryDependencies,
): Promise<PasswordRecoveryForm> {
  let form: PasswordRecoveryForm | undefined
  const app = createSSRApp({
    setup() {
      form = usePasswordRecoveryForm(dependencies)
      return () => h('form')
    },
  })

  await renderToString(app)

  if (!form)
    throw new Error('Password recovery form did not initialize')

  return form
}

it('returns the enumeration-safe success message', async () => {
  const requestPasswordReset = vi.fn().mockResolvedValue(undefined)
  const action = createPasswordRecoveryAction({ requestPasswordReset })

  await expect(action({ email: 'user@example.com' })).resolves.toEqual({
    status: RECOVERY_SUCCESS_MESSAGE,
    error: '',
  })
  expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'user@example.com' })
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

it('clears a successful status when an invalid retry is submitted', async () => {
  const requestPasswordReset = vi.fn().mockResolvedValue(undefined)
  const form = await createForm({ requestPasswordReset })
  form.email.value = 'user@example.com'
  await form.submit()
  expect(form.statusMessage.value).toBe(RECOVERY_SUCCESS_MESSAGE)

  form.email.value = 'not-an-email'
  await form.submit()

  expect(form.statusMessage.value).toBe('')
  expect(form.errorMessage.value).toBe(RECOVERY_EMAIL_ERROR)
  expect(requestPasswordReset).toHaveBeenCalledTimes(1)
})
