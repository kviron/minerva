import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h } from 'vue'
import { expect, it, vi } from 'vitest'
import {
  createSignInAction,
  useSignInForm,
} from '../../../../app/features/identity/model/use-sign-in-form'
import { SIGN_IN_ERROR } from '../../../../app/features/identity/model/schemas'

type SignInDependencies = Parameters<typeof useSignInForm>[0]
type SignInForm = ReturnType<typeof useSignInForm>

async function createForm(dependencies: SignInDependencies): Promise<SignInForm> {
  let form: SignInForm | undefined
  const app = createSSRApp({
    setup() {
      form = useSignInForm(dependencies)
      return () => h('form')
    },
  })

  await renderToString(app)

  if (!form)
    throw new Error('Sign-in form did not initialize')

  return form
}

it('signs in and navigates to the dashboard', async () => {
  const signIn = vi.fn().mockResolvedValue(undefined)
  const navigate = vi.fn().mockResolvedValue(undefined)
  const action = createSignInAction({ signIn, navigate })

  await expect(action({ identifier: 'user@example.com', password: 'secret' }))
    .resolves.toBeNull()
  expect(signIn).toHaveBeenCalledWith({ identifier: 'user@example.com', password: 'secret' })
  expect(navigate).toHaveBeenCalledWith('/dashboard')
})

it('returns the existing generic error and does not navigate', async () => {
  const navigate = vi.fn()
  const action = createSignInAction({
    signIn: vi.fn().mockRejectedValue(new Error('provider')),
    navigate,
  })

  await expect(action({ identifier: 'user@example.com', password: 'wrong' }))
    .resolves.toBe(SIGN_IN_ERROR)
  expect(navigate).not.toHaveBeenCalled()
})

it('propagates navigation failure after a successful sign in', async () => {
  const navigationError = new Error('navigation')
  const action = createSignInAction({
    signIn: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn().mockRejectedValue(navigationError),
  })

  await expect(action({ identifier: 'user@example.com', password: 'secret' }))
    .rejects.toBe(navigationError)
})

it('marks only the field that fails validation', async () => {
  const form = await createForm({
    signIn: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
  })

  form.identifier.value = ''
  form.password.value = 'secret'
  await form.submit()
  expect(form.identifierInvalid.value).toBe(true)
  expect(form.passwordInvalid.value).toBe(false)

  form.identifier.value = 'user@example.com'
  form.password.value = ''
  await form.submit()
  expect(form.identifierInvalid.value).toBe(false)
  expect(form.passwordInvalid.value).toBe(true)
})

it('marks both fields when sign in fails', async () => {
  const form = await createForm({
    signIn: vi.fn().mockRejectedValue(new Error('provider')),
    navigate: vi.fn(),
  })
  form.identifier.value = 'user@example.com'
  form.password.value = 'wrong'

  await form.submit()

  expect(form.errorMessage.value).toBe(SIGN_IN_ERROR)
  expect(form.identifierInvalid.value).toBe(true)
  expect(form.passwordInvalid.value).toBe(true)
})

it('clears a previous submit error while a valid retry is pending', async () => {
  let resolveRetry: (() => void) | undefined
  const retryPending = new Promise<void>((resolve) => {
    resolveRetry = resolve
  })
  const signIn = vi.fn()
    .mockRejectedValueOnce(new Error('provider'))
    .mockImplementationOnce(() => retryPending)
  const form = await createForm({ signIn, navigate: vi.fn() })
  form.identifier.value = 'user@example.com'
  form.password.value = 'secret'
  await form.submit()

  const retry = form.submit()
  await vi.waitFor(() => expect(signIn).toHaveBeenCalledTimes(2))

  expect(form.errorMessage.value).toBe('')
  expect(form.identifierInvalid.value).toBe(false)
  expect(form.passwordInvalid.value).toBe(false)

  resolveRetry?.()
  await retry
})

it('reuses an in-flight sign-in submission and allows a later submission', async () => {
  let resolveFirst: (() => void) | undefined
  const firstPending = new Promise<void>((resolve) => {
    resolveFirst = resolve
  })
  const signIn = vi.fn()
    .mockImplementationOnce(() => firstPending)
    .mockResolvedValueOnce(undefined)
  const navigate = vi.fn().mockResolvedValue(undefined)
  const form = await createForm({ signIn, navigate })
  form.identifier.value = 'user@example.com'
  form.password.value = 'secret'

  const first = form.submit()
  const duplicate = form.submit()

  expect(duplicate).toBe(first)
  await vi.waitFor(() => expect(signIn).toHaveBeenCalledTimes(1))
  resolveFirst?.()
  await expect(Promise.all([first, duplicate])).resolves.toEqual([undefined, undefined])
  expect(navigate).toHaveBeenCalledTimes(1)

  await form.submit()
  expect(signIn).toHaveBeenCalledTimes(2)
  expect(navigate).toHaveBeenCalledTimes(2)
})

it('allows another sign-in submission after navigation rejects', async () => {
  const navigationError = new Error('navigation')
  const signIn = vi.fn().mockResolvedValue(undefined)
  const navigate = vi.fn()
    .mockRejectedValueOnce(navigationError)
    .mockResolvedValueOnce(undefined)
  const form = await createForm({ signIn, navigate })
  form.identifier.value = 'user@example.com'
  form.password.value = 'secret'

  await expect(form.submit()).rejects.toBe(navigationError)
  await expect(form.submit()).resolves.toBeUndefined()
  expect(signIn).toHaveBeenCalledTimes(2)
})
