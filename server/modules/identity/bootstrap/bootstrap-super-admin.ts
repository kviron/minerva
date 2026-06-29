import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getServerEnv } from '../../../../shared/config/env'
import { AUTH_MODE } from '../../../../shared/identity/constants'
import { createMinervaAuth } from '../auth/create-auth'
import type { PasswordResetMailer } from '../auth/contracts'

export interface BootstrapInput {
  email: string
  username: string
  password: string
}

type BootstrapCode = 'BOOTSTRAP_ALREADY_COMPLETE' | 'BOOTSTRAP_IDENTITY_CONFLICT'

export class BootstrapError extends Error {
  constructor(public readonly code: BootstrapCode) {
    super(code)
    this.name = 'BootstrapError'
  }
}

const bootstrapMailer: PasswordResetMailer = {
  sendPasswordReset: async () => {},
}

export async function bootstrapSuperAdmin(input: BootstrapInput) {
  const env = getServerEnv()
  const email = input.email.trim().toLowerCase()
  const username = input.username.trim().toLowerCase()
  const queryClient = postgres(env.DATABASE_URL, { max: 1 })
  const db = drizzle(queryClient)
  let locked = false

  try {
    await queryClient`select pg_advisory_lock(hashtext('minerva-bootstrap-super-admin'))`
    locked = true

    const administrators = await queryClient<{
      id: string
      email: string
      username: string | null
    }[]>`
      select id, email, username
      from "user"
      where super_admin = true
      limit 1
    `
    const administrator = administrators[0]

    if (administrator) {
      if (
        administrator.email.toLowerCase() === email
        && administrator.username?.toLowerCase() === username
      ) {
        return { outcome: 'existing' as const, userId: administrator.id }
      }

      throw new BootstrapError('BOOTSTRAP_ALREADY_COMPLETE')
    }

    const conflicts = await queryClient<{ id: string }[]>`
      select id
      from "user"
      where lower(email) = ${email} or lower(username) = ${username}
      limit 1
    `

    if (conflicts.length > 0) {
      throw new BootstrapError('BOOTSTRAP_IDENTITY_CONFLICT')
    }

    const auth = createMinervaAuth({
      mode: AUTH_MODE.BOOTSTRAP,
      db,
      baseURL: env.BETTER_AUTH_URL,
      trustedOrigins: env.TRUSTED_ORIGINS,
      mailer: bootstrapMailer,
    })
    const result = await auth.api.signUpEmail({
      body: {
        email,
        username,
        displayUsername: input.username.trim(),
        name: input.username.trim(),
        password: input.password,
      },
    })

    return { outcome: 'created' as const, userId: result.user.id }
  } finally {
    try {
      if (locked) {
        await queryClient`select pg_advisory_unlock(hashtext('minerva-bootstrap-super-admin'))`
      }
    } finally {
      await queryClient.end()
    }
  }
}
