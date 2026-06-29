import { z } from 'zod'

export const SIGN_IN_ERROR = 'Неверный логин или пароль'
export const RECOVERY_EMAIL_ERROR = 'Введите корректный email'
export const PASSWORD_LENGTH_ERROR = 'Пароль должен содержать от 12 до 256 символов'
export const PASSWORD_CONFIRMATION_ERROR = 'Пароли не совпадают'

export const signInSchema = z.object({
  identifier: z.string().min(1, SIGN_IN_ERROR).max(255, SIGN_IN_ERROR),
  password: z.string().min(1, SIGN_IN_ERROR).max(256, SIGN_IN_ERROR),
})

export const passwordRecoverySchema = z.object({
  email: z.string().email(RECOVERY_EMAIL_ERROR).max(255, RECOVERY_EMAIL_ERROR),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(12, PASSWORD_LENGTH_ERROR).max(256, PASSWORD_LENGTH_ERROR),
  confirmation: z.string().min(1, PASSWORD_CONFIRMATION_ERROR),
}).refine(values => values.password === values.confirmation, {
  path: ['confirmation'],
  message: PASSWORD_CONFIRMATION_ERROR,
})

export type SignInValues = z.infer<typeof signInSchema>
export type PasswordRecoveryValues = z.infer<typeof passwordRecoverySchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
