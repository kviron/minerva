import { getServerEnv } from '../../../../shared/config/env'
import { AUTH_MODE } from '../../../../shared/identity/constants'
import { getDatabase } from '../../../infrastructure/database/client'
import { createSmtpPasswordResetMailer } from '../../../infrastructure/mail/smtp-password-reset-mailer'
import { createMinervaAuth } from './create-auth'

let runtimeAuth: ReturnType<typeof createMinervaAuth> | undefined

export function getAuth() {
  if (runtimeAuth) return runtimeAuth

  const env = getServerEnv()

  runtimeAuth = createMinervaAuth({
    mode: AUTH_MODE.RUNTIME,
    db: getDatabase().db,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: env.TRUSTED_ORIGINS,
    mailer: createSmtpPasswordResetMailer({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      from: env.MAIL_FROM,
    }),
  })

  return runtimeAuth
}
