import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export type AuthMode = 'runtime' | 'bootstrap' | 'test-seed'

export interface PasswordResetMailer {
  sendPasswordReset(input: { to: string, resetUrl: string }): Promise<void>
}

export interface CreateMinervaAuthInput {
  mode: AuthMode
  db: PostgresJsDatabase
  baseURL: string
  trustedOrigins: string[]
  mailer: PasswordResetMailer
}
