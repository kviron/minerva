import { describe, expect, it } from 'vitest'
import {
  passwordRecoverySchema,
  resetPasswordSchema,
  signInSchema,
} from '../../../../app/features/identity/model/schemas'

describe('Identity form schemas', () => {
  it('accepts the existing sign-in values', () => {
    expect(signInSchema.safeParse({
      identifier: 'user@example.com', password: 'Correct-Horse-Battery-1',
    }).success).toBe(true)
  })

  it('requires a valid recovery email', () => {
    expect(passwordRecoverySchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })

  it('enforces password length and confirmation', () => {
    expect(resetPasswordSchema.safeParse({
      password: 'short', confirmation: 'short',
    }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({
      password: 'Correct-Horse-Battery-1', confirmation: 'Different-Horse-Battery-2',
    }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({
      password: 'Correct-Horse-Battery-1', confirmation: 'Correct-Horse-Battery-1',
    }).success).toBe(true)
  })
})
