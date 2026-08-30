import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  requestPasswordResetRequestSchema,
  resetPasswordRequestSchema,
  signInRequestSchema,
} from '../../../shared/identity/contracts'

describe('identity transport contracts', () => {
  it('strictly validates identity commands', () => {
    expect(signInRequestSchema.safeParse({ identifier: 'minerva', password: 'password' }).success).toBe(true)
    expect(signInRequestSchema.safeParse({ identifier: 'minerva', password: 'password', superAdmin: true }).success).toBe(false)
    expect(requestPasswordResetRequestSchema.safeParse({ email: 'user@example.com' }).success).toBe(true)
    expect(resetPasswordRequestSchema.safeParse({ token: 'token', newPassword: 'x'.repeat(12) }).success).toBe(true)
    expect(resetPasswordRequestSchema.safeParse({ token: 'token', newPassword: 'short' }).success).toBe(false)
  })

  it('reuses shared validation and disables caching at every identity endpoint', async () => {
    const sources = await Promise.all([
      readFile('server/api/identity/sign-in.post.ts', 'utf8'),
      readFile('server/api/identity/request-password-reset.post.ts', 'utf8'),
      readFile('server/api/identity/reset-password.post.ts', 'utf8'),
    ])

    for (const source of sources) {
      expect(source).toContain('readValidatedBody')
      expect(source).toContain("'Cache-Control', 'private, no-store'")
      expect(source).not.toContain("from 'zod'")
    }
  })
})
