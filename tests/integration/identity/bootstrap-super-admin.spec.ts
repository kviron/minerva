import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import type { AccountStatus } from '../../../shared/identity/types'
import { bootstrapSuperAdmin } from '../../../server/modules/identity/bootstrap/bootstrap-super-admin'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

const password = 'Correct-Horse-Battery-1'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)
vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-012345678901234567890')
vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3000')
vi.stubEnv('MCP_RESOURCE_URL', 'http://127.0.0.1:3000/mcp')
vi.stubEnv('TRUSTED_ORIGINS', 'http://127.0.0.1:3000')
vi.stubEnv('RATE_LIMIT_HMAC_SECRET', 'test-rate-limit-secret-01234567890')
vi.stubEnv('SMTP_HOST', '127.0.0.1')
vi.stubEnv('SMTP_PORT', '1025')
vi.stubEnv('MAIL_FROM', 'Minerva <no-reply@minerva.local>')
vi.stubEnv('MAILPIT_API_URL', 'http://127.0.0.1:8025')

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()

  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
  } finally {
    await database.close()
  }
})

describe('bootstrapSuperAdmin', () => {
  it('creates the first active super admin', async () => {
    const result = await bootstrapSuperAdmin({
      email: 'admin@example.com',
      username: 'root.admin',
      password,
    })
    const database = createTestDatabase()

    try {
      const users = await database.queryClient<{
        id: string
        email: string
        username: string
        super_admin: boolean
        status: AccountStatus
      }[]>`select id, email, username, super_admin, status from "user"`

      expect(result).toEqual({ outcome: 'created', userId: users[0]?.id })
      expect(users).toEqual([expect.objectContaining({
        email: 'admin@example.com',
        username: 'root.admin',
        super_admin: true,
        status: ACCOUNT_STATUS.ACTIVE,
      })])
    } finally {
      await database.close()
    }
  })

  it('is idempotent for the same normalized identity', async () => {
    const first = await bootstrapSuperAdmin({
      email: 'admin@example.com', username: 'root.admin', password,
    })
    const second = await bootstrapSuperAdmin({
      email: ' ADMIN@EXAMPLE.COM ', username: ' ROOT.ADMIN ', password,
    })

    expect(first.outcome).toBe('created')
    expect(second).toEqual({ outcome: 'existing', userId: first.userId })
  })

  it('refuses a second bootstrap identity', async () => {
    await bootstrapSuperAdmin({
      email: 'admin@example.com', username: 'root.admin', password,
    })

    await expect(bootstrapSuperAdmin({
      email: 'other@example.com', username: 'other.admin', password,
    })).rejects.toMatchObject({ code: 'BOOTSTRAP_ALREADY_COMPLETE' })
  })

  it('never elevates an existing ordinary account', async () => {
    const database = createTestDatabase()

    try {
      await database.queryClient`
        insert into "user" (name, email, username, email_verified, super_admin, status)
        values ('Existing user', 'admin@example.com', 'root.admin', false, false, 'active')
      `
    } finally {
      await database.close()
    }

    await expect(bootstrapSuperAdmin({
      email: 'admin@example.com', username: 'root.admin', password,
    })).rejects.toMatchObject({ code: 'BOOTSTRAP_IDENTITY_CONFLICT' })

    const verificationDatabase = createTestDatabase()
    try {
      const users = await verificationDatabase.queryClient<{ super_admin: boolean }[]>`
        select super_admin from "user" where email = 'admin@example.com'
      `
      expect(users[0]?.super_admin).toBe(false)
    } finally {
      await verificationDatabase.close()
    }
  })
})
