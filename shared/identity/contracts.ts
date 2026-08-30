import { z } from 'zod'

export const signInRequestSchema = z.object({
  identifier: z.string().min(1).max(255),
  password: z.string().min(1).max(256),
}).strict().readonly()

export const requestPasswordResetRequestSchema = z.object({
  email: z.string().email().max(255),
}).strict().readonly()

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1).max(512),
  newPassword: z.string().min(12).max(256),
}).strict().readonly()

export type SignInRequest = z.infer<typeof signInRequestSchema>
export type RequestPasswordResetRequest = z.infer<typeof requestPasswordResetRequestSchema>
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>
