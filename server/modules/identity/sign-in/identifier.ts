import { z } from 'zod'
import { IDENTITY_CODE, LOGIN_IDENTIFIER_KIND } from '../../../../shared/identity/constants'
import type { LoginIdentifierKind } from '../../../../shared/identity/types'

export interface LoginIdentifier {
  readonly kind: LoginIdentifierKind
  readonly normalized: string
}

export type LoginIdentifierResult =
  | { readonly ok: true, readonly value: LoginIdentifier }
  | { readonly ok: false, readonly code: typeof IDENTITY_CODE.INVALID_CREDENTIALS }

const emailSchema = z.string().email()

export function classifyLoginIdentifier(value: string): LoginIdentifierResult {
  const normalized = value.trim().toLowerCase()

  if (normalized.length === 0 || normalized.length > 255) {
    return { ok: false, code: IDENTITY_CODE.INVALID_CREDENTIALS }
  }

  return {
    ok: true,
    value: {
      kind: emailSchema.safeParse(normalized).success
        ? LOGIN_IDENTIFIER_KIND.EMAIL
        : LOGIN_IDENTIFIER_KIND.USERNAME,
      normalized,
    },
  }
}
