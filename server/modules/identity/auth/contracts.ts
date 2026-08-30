import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { AuthMode } from '../../../../shared/identity/types'

export interface PasswordResetMailer {
  sendPasswordReset(input: { to: string, resetUrl: string }): Promise<void>
}

export interface CreateMinervaAuthInput {
  mode: AuthMode
  db: PostgresJsDatabase
  baseURL: string
  trustedOrigins: string[]
  mailer: PasswordResetMailer
  oauth?: Readonly<{ resource: string }>
}
