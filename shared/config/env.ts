import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  TRUSTED_ORIGINS: z.string()
    .transform(value => value.split(',').map(origin => origin.trim()).filter(Boolean))
    .pipe(z.array(z.string().url()).min(1)),
  RATE_LIMIT_HMAC_SECRET: z.string().min(32),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535),
  MAIL_FROM: z.string().min(3),
  MAILPIT_API_URL: z.string().url(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(input)
}

let cachedServerEnv: ServerEnv | undefined

export function getServerEnv(): ServerEnv {
  return cachedServerEnv ??= parseServerEnv(process.env)
}
