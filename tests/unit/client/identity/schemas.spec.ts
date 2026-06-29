import { describe, expect, it } from 'vitest'
import {
  passwordRecoverySchema,
  resetPasswordSchema,
  signInSchema,
} from '../../../../app/features/identity/model/schemas'

function expectIssue(result: unknown, message: string, path?: string[]) {
  expect(result).toMatchObject({
    success: false,
    error: {
      issues: expect.arrayContaining([
        expect.objectContaining({ message, ...(path ? { path } : {}) }),
      ]),
    },
  })
}

describe('Identity form schemas', () => {
  it('accepts sign-in field maxima and rejects overflow with the generic error', () => {
    expect(signInSchema.safeParse({
      identifier: 'a'.repeat(255), password: 'p'.repeat(256),
    }).success).toBe(true)
    expectIssue(signInSchema.safeParse({
      identifier: 'a'.repeat(256), password: 'p'.repeat(257),
    }), 'Неверный логин или пароль')
  })

  it('requires a valid recovery email with the exact error', () => {
    expectIssue(
      passwordRecoverySchema.safeParse({ email: 'not-an-email' }),
      'Введите корректный email',
    )
  })

  it('accepts recovery email length 255 and rejects 256', () => {
    const domain = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.`
    expect(passwordRecoverySchema.safeParse({
      email: `a@${domain}${'e'.repeat(61)}`,
    }).success).toBe(true)

    expectIssue(passwordRecoverySchema.safeParse({
      email: `a@${domain}${'e'.repeat(62)}`,
    }), 'Введите корректный email')
  })

  it.each([11, 257])('rejects a %i-character reset password with the exact error', (length) => {
    const password = 'p'.repeat(length)
    expectIssue(
      resetPasswordSchema.safeParse({ password, confirmation: password }),
      'Пароль должен содержать от 12 до 256 символов',
    )
  })

  it.each([12, 256])('accepts a matching %i-character reset password', (length) => {
    const password = 'p'.repeat(length)
    expect(resetPasswordSchema.safeParse({ password, confirmation: password }).success).toBe(true)
  })

  it('reports a mismatch on the confirmation field', () => {
    expectIssue(resetPasswordSchema.safeParse({
      password: 'p'.repeat(12), confirmation: 'q'.repeat(12),
    }), 'Пароли не совпадают', ['confirmation'])
  })
})
