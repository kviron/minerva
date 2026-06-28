import { APIError } from '@better-auth/core/error'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins/username'
import { sql } from 'drizzle-orm'
import * as authSchema from '../../infrastructure/database/schema'
import type { CreateMinervaAuthInput } from './contracts'

export function createMinervaAuth({ mode, db, baseURL, trustedOrigins, mailer }: CreateMinervaAuthInput) {
  return betterAuth({
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    advanced: { database: { generateId: 'uuid' } },
    emailAndPassword: {
      enabled: true,
      disableSignUp: mode === 'runtime',
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 256,
      resetPasswordTokenExpiresIn: 1800,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, token }) {
        await mailer.sendPasswordReset({
          to: user.email,
          resetUrl: `${baseURL}/auth/reset-password/${encodeURIComponent(token)}`,
        })
      },
    },
    verification: { storeIdentifier: 'hashed' },
    session: { expiresIn: 604800, updateAge: 86400 },
    user: {
      additionalFields: {
        superAdmin: { type: 'boolean', defaultValue: false, input: false },
        status: { type: ['active', 'disabled'], defaultValue: 'active', input: false },
        disabledAt: { type: 'date', required: false, input: false },
        disabledReason: { type: 'string', required: false, input: false },
        lastLoginAt: { type: 'date', required: false, input: false },
      },
    },
    disabledPaths: ['/is-username-available'],
    rateLimit: { enabled: true, storage: 'database' },
    plugins: [username()],
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            if (mode !== 'bootstrap') return

            return { data: { ...user, superAdmin: true, status: 'active' } }
          },
        },
      },
      session: {
        create: {
          async before(session) {
            const users = await db.execute<{ status: 'active' | 'disabled' }>(sql`
              select status from "user" where id = ${session.userId} limit 1
            `)

            if (users[0]?.status !== 'active') {
              throw new APIError('UNAUTHORIZED', {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials',
              })
            }
          },
          async after(session) {
            await db.execute(sql`
              update "user" set last_login_at = now() where id = ${session.userId}
            `)
          },
        },
      },
    },
  })
}
