import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h } from 'vue'
import { expect, it, vi } from 'vitest'
import {
  createResetPasswordAction,
  RESET_TOKEN_ERROR,
  useResetPasswordForm,
} from '../../../../app/features/identity/model/use-reset-password-form'
import {
  PASSWORD_CONFIRMATION_ERROR,
  PASSWORD_LENGTH_ERROR,
} from '../../../../app/features/identity/model/schemas'

type ResetPasswordDependencies = Parameters<typeof useResetPasswordForm>[1]
type ResetPasswordForm = ReturnType<typeof useResetPasswordForm>
type ResetPasswordToken = Parameters<typeof useResetPasswordForm>[0]

it('preserves the existing invalid-token message', () => {
  expect(RESET_TOKEN_ERROR).toBe('Ссылка недействительна или уже использована')
})

async function createForm(
  token: ResetPasswordToken,
  dependencies: ResetPasswordDependencies,
): Promise<ResetPasswordForm> {
  let form: ResetPasswordForm | undefined
  const app = createSSRApp({
    setup() {
      form = useResetPasswordForm(token, dependencies)
      return () => h('form')
    },
  })

  await renderToString(app)

  if (!form)
    throw new Error('Reset-password form did not initialize')

  return form
}

it('submits the page-owned token and navigates to sign in', async () => {
  const resetPassword = vi.fn().mockResolvedValue(undefined)
  const navigate = vi.fn().mockResolvedValue(undefined)
  const action = createResetPasswordAction({ resetPassword, navigate })

  await expect(action('token', {
    password: 'Correct-Horse-Battery-1',
    confirmation: 'Correct-Horse-Battery-1',
  })).resolves.toBeNull()
  expect(resetPassword).toHaveBeenCalledWith({
    token: 'token',
    newPassword: 'Correct-Horse-Battery-1',
  })
  expect(navigate).toHaveBeenCalledWith('/auth')
})

it('reads the current token when the form is submitted', async () => {
  let token = 'initial-token'
  const resetPassword = vi.fn().mockResolvedValue(undefined)
  const form = await createForm(() => token, {
    resetPassword,
    navigate: vi.fn(),
  })
  token = 'updated-token'
  form.password.value = 'Correct-Horse-Battery-1'
  form.confirmation.value = 'Correct-Horse-Battery-1'

  await form.submit()

  expect(resetPassword).toHaveBeenCalledWith({
    token: 'updated-token',
    newPassword: 'Correct-Horse-Battery-1',
  })
})

it('returns the existing invalid-token message and does not navigate', async () => {
  const navigate = vi.fn()
  const action = createResetPasswordAction({
    resetPassword: vi.fn().mockRejectedValue(new Error('invalid')),
    navigate,
  })

  await expect(action('token', {
    password: 'Correct-Horse-Battery-1',
    confirmation: 'Correct-Horse-Battery-1',
  })).resolves.toBe(RESET_TOKEN_ERROR)
  expect(navigate).not.toHaveBeenCalled()
})

it('propagates navigation failure after a successful reset', async () => {
  const navigationError = new Error('navigation')
  const action = createResetPasswordAction({
    resetPassword: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn().mockRejectedValue(navigationError),
  })

  await expect(action('token', {
    password: 'Correct-Horse-Battery-1',
    confirmation: 'Correct-Horse-Battery-1',
  })).rejects.toBe(navigationError)
})

it('marks only the field that fails client validation', async () => {
  const form = await createForm('token', {
    resetPassword: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
  })

  form.password.value = 'short'
  form.confirmation.value = 'short'
  await form.submit()

  expect(form.passwordInvalid.value).toBe(true)
  expect(form.confirmationInvalid.value).toBe(false)
})

it('exposes each client validation error separately from submit feedback', async () => {
  const form = await createForm('token', {
    resetPassword: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
  })

  form.password.value = 'short'
  form.confirmation.value = 'short'
  await form.submit()
  expect(form.passwordError.value).toBe(PASSWORD_LENGTH_ERROR)
  expect(form.confirmationError.value).toBe('')
  expect(form.submitError.value).toBe('')

  form.password.value = 'Correct-Horse-Battery-1'
  form.confirmation.value = 'Different-Horse-Battery-2'
  await form.submit()
  expect(form.passwordError.value).toBe('')
  expect(form.confirmationError.value).toBe(PASSWORD_CONFIRMATION_ERROR)
  expect(form.submitError.value).toBe('')
})

it('keeps both fields valid when reset fails at form level', async () => {
  const form = await createForm('token', {
    resetPassword: vi.fn().mockRejectedValue(new Error('invalid')),
    navigate: vi.fn(),
  })
  form.password.value = 'Correct-Horse-Battery-1'
  form.confirmation.value = 'Correct-Horse-Battery-1'

  await form.submit()

  expect(form.submitError.value).toBe(RESET_TOKEN_ERROR)
  expect(form.passwordInvalid.value).toBe(false)
  expect(form.confirmationInvalid.value).toBe(false)
})

it('keeps reset failure feedback separate from field validation errors', async () => {
  const form = await createForm('token', {
    resetPassword: vi.fn().mockRejectedValue(new Error('invalid')),
    navigate: vi.fn(),
  })
  form.password.value = 'Correct-Horse-Battery-1'
  form.confirmation.value = 'Correct-Horse-Battery-1'

  await form.submit()

  expect(form.submitError.value).toBe(RESET_TOKEN_ERROR)
  expect(form.passwordError.value).toBe('')
  expect(form.confirmationError.value).toBe('')
  expect(form).not.toHaveProperty('errorMessage')
})

it('clears a previous reset error when an invalid retry is submitted', async () => {
  const resetPassword = vi.fn().mockRejectedValue(new Error('invalid'))
  const form = await createForm('token', { resetPassword, navigate: vi.fn() })
  form.password.value = 'Correct-Horse-Battery-1'
  form.confirmation.value = 'Correct-Horse-Battery-1'
  await form.submit()
  expect(form.submitError.value).toBe(RESET_TOKEN_ERROR)

  form.password.value = 'short'
  form.confirmation.value = 'short'
  await form.submit()

  expect(form.submitError.value).toBe('')
  expect(form.passwordError.value).toBe(PASSWORD_LENGTH_ERROR)
  expect(form.passwordInvalid.value).toBe(true)
  expect(form.confirmationInvalid.value).toBe(false)
  expect(resetPassword).toHaveBeenCalledTimes(1)
})

it('reuses an in-flight reset submission and allows a later submission', async () => {
  let resolveFirst: (() => void) | undefined
  const firstPending = new Promise<void>((resolve) => {
    resolveFirst = resolve
  })
  const resetPassword = vi.fn()
    .mockImplementationOnce(() => firstPending)
    .mockResolvedValueOnce(undefined)
  const navigate = vi.fn().mockResolvedValue(undefined)
  const form = await createForm('token', { resetPassword, navigate })
  form.password.value = 'Correct-Horse-Battery-1'
  form.confirmation.value = 'Correct-Horse-Battery-1'

  const first = form.submit()
  const duplicate = form.submit()

  expect(duplicate).toBe(first)
  await vi.waitFor(() => expect(resetPassword).toHaveBeenCalledTimes(1))
  resolveFirst?.()
  await expect(Promise.all([first, duplicate])).resolves.toEqual([undefined, undefined])
  expect(form.submitError.value).toBe('')
  expect(navigate).toHaveBeenCalledTimes(1)

  await form.submit()
  expect(resetPassword).toHaveBeenCalledTimes(2)
  expect(navigate).toHaveBeenCalledTimes(2)
})

it('allows another reset submission after navigation rejects', async () => {
  const navigationError = new Error('navigation')
  const resetPassword = vi.fn().mockResolvedValue(undefined)
  const navigate = vi.fn()
    .mockRejectedValueOnce(navigationError)
    .mockResolvedValueOnce(undefined)
  const form = await createForm('token', { resetPassword, navigate })
  form.password.value = 'Correct-Horse-Battery-1'
  form.confirmation.value = 'Correct-Horse-Battery-1'

  await expect(form.submit()).rejects.toBe(navigationError)
  await expect(form.submit()).resolves.toBeUndefined()
  expect(resetPassword).toHaveBeenCalledTimes(2)
})
