import { z } from 'zod'

const credentialKeysSchema = z.string().transform((value, context) => {
  const keys = new Map<number, Buffer>()
  const entries = value.split(',').map(entry => entry.trim()).filter(Boolean)

  for (const entry of entries) {
    const match = /^(\d+):([A-Za-z0-9+/]+={0,2})$/.exec(entry)
    const version = match ? Number(match[1]) : 0
    const encoded = match?.[2] ?? ''
    const key = Buffer.from(encoded, 'base64')
    if (!match || !Number.isSafeInteger(version) || version < 1 || keys.has(version) || key.length !== 32 || key.toString('base64') !== encoded) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid credential encryption key configuration' })
      return z.NEVER
    }
    keys.set(version, key)
  }

  if (keys.size === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one credential encryption key is required' })
    return z.NEVER
  }
  return keys
})

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

const credentialEncryptionEnvSchema = z.object({
  CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION: z.coerce.number().int().positive(),
  CREDENTIAL_ENCRYPTION_KEYS: credentialKeysSchema,
}).superRefine((value, context) => {
  if (!value.CREDENTIAL_ENCRYPTION_KEYS.has(value.CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION'],
      message: 'Active credential encryption key version is unavailable',
    })
  }
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type CredentialEncryptionEnv = z.infer<typeof credentialEncryptionEnvSchema>

export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(input)
}

export function parseCredentialEncryptionEnv(input: Record<string, string | undefined>): CredentialEncryptionEnv {
  return credentialEncryptionEnvSchema.parse(input)
}

let cachedServerEnv: ServerEnv | undefined
let cachedCredentialEncryptionEnv: CredentialEncryptionEnv | undefined

export function getServerEnv(): ServerEnv {
  return cachedServerEnv ??= parseServerEnv(process.env)
}

export function getCredentialEncryptionEnv(): CredentialEncryptionEnv {
  return cachedCredentialEncryptionEnv ??= parseCredentialEncryptionEnv(process.env)
}
