import { z } from 'zod'
import { IdentityError } from './errors'

export interface LoginIdentifier {
  kind: 'email' | 'username'
  normalized: string
}

const emailSchema = z.string().email()

export function classifyLoginIdentifier(value: string): LoginIdentifier {
  const normalized = value.trim().toLowerCase()

  if (normalized.length === 0 || normalized.length > 255) {
    throw new IdentityError('INVALID_CREDENTIALS')
  }

  return {
    kind: emailSchema.safeParse(normalized).success ? 'email' : 'username',
    normalized,
  }
}
