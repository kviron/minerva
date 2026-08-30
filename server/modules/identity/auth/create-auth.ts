import { APIError } from '@better-auth/core/error'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins/username'
import { sql } from 'drizzle-orm'
import { ACCOUNT_STATUS, AUTH_MODE, IDENTITY_CODE } from '../../../../shared/identity/constants'
import type { AccountStatus } from '../../../../shared/identity/types'
import * as authSchema from '../../../infrastructure/database/schema'
import type { CreateMinervaAuthInput } from './contracts'
import { createOAuthGrantManagement } from '../oauth-grants'
import { createMinervaOAuthProvider } from './oauth-provider'

export function createMinervaAuth({ mode, db, baseURL, trustedOrigins, mailer, oauth }: CreateMinervaAuthInput) {
  const grantManagement = oauth ? createOAuthGrantManagement(db) : null
  return betterAuth({
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    advanced: {
      database: { generateId: 'uuid' },
      useSecureCookies: new URL(baseURL).protocol === 'https:',
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: mode === AUTH_MODE.RUNTIME,
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
        status: {
          type: [ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.DISABLED],
          defaultValue: ACCOUNT_STATUS.ACTIVE,
          input: false,
        },
        disabledAt: { type: 'date', required: false, input: false },
        disabledReason: { type: 'string', required: false, input: false },
        lastLoginAt: { type: 'date', required: false, input: false },
      },
    },
    disabledPaths: ['/is-username-available'],
    rateLimit: { enabled: true, storage: 'database' },
    plugins: [username(), ...(oauth ? [createMinervaOAuthProvider({
      ...oauth,
      ensureActiveGrant: input => grantManagement?.ensureActive(input) ?? Promise.reject(new Error('OAuth grant management is unavailable')),
    })] : [])],
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            if (mode !== AUTH_MODE.BOOTSTRAP) return

            return { data: { ...user, superAdmin: true, status: ACCOUNT_STATUS.ACTIVE } }
          },
        },
      },
      session: {
        create: {
          async before(session) {
            const users = await db.execute<{ status: AccountStatus }>(sql`
              select status from "user" where id = ${session.userId} limit 1
            `)

            if (users[0]?.status !== ACCOUNT_STATUS.ACTIVE) {
              throw new APIError('UNAUTHORIZED', {
                code: IDENTITY_CODE.INVALID_CREDENTIALS,
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
