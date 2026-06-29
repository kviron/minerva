import { z } from 'zod'
import { IDENTITY_CODE, LOGIN_IDENTIFIER_KIND } from '../../../shared/identity/constants'
import type { LoginIdentifierKind } from '../../../shared/identity/types'
import { IdentityError } from './errors'

export interface LoginIdentifier {
  kind: LoginIdentifierKind
  normalized: string
}

const emailSchema = z.string().email()

export function classifyLoginIdentifier(value: string): LoginIdentifier {
  const normalized = value.trim().toLowerCase()

  if (normalized.length === 0 || normalized.length > 255) {
    throw new IdentityError(IDENTITY_CODE.INVALID_CREDENTIALS)
  }

  return {
    kind: emailSchema.safeParse(normalized).success
      ? LOGIN_IDENTIFIER_KIND.EMAIL
      : LOGIN_IDENTIFIER_KIND.USERNAME,
    normalized,
  }
}
