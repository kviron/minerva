import nodemailer from 'nodemailer'
import type { PasswordResetMailer } from '../../modules/identity/contracts'

export interface SmtpPasswordResetMailerOptions {
  host: string
  port: number
  from: string
}

export function createSmtpPasswordResetMailer(
  options: SmtpPasswordResetMailerOptions,
): PasswordResetMailer {
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: false,
  })

  return {
    async sendPasswordReset({ to, resetUrl }) {
      try {
        await transport.sendMail({
          from: options.from,
          to,
          subject: 'Восстановление пароля Minerva',
          text: `Для смены пароля перейдите по ссылке: ${resetUrl}`,
        })
      } catch {
        throw new Error('Password reset email delivery failed.')
      }
    },
  }
}
