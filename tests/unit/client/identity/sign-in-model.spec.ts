import { expect, it, vi } from 'vitest'
import { createSignInAction } from '../../../../app/features/identity/model/use-sign-in-form'
import { SIGN_IN_ERROR } from '../../../../app/features/identity/model/schemas'

it('signs in and navigates home', async () => {
  const signIn = vi.fn().mockResolvedValue(undefined)
  const navigate = vi.fn().mockResolvedValue(undefined)
  const action = createSignInAction({ signIn, navigate })

  await expect(action({ identifier: 'user@example.com', password: 'secret' }))
    .resolves.toBeNull()
  expect(signIn).toHaveBeenCalledWith({ identifier: 'user@example.com', password: 'secret' })
  expect(navigate).toHaveBeenCalledWith('/')
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
