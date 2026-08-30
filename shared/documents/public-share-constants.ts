export const DOCUMENT_PUBLIC_SHARE_SCOPE = {
  DOCUMENT: 'document',
  BRANCH: 'branch',
} as const

export const DOCUMENT_PUBLIC_SHARE_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const

export const DOCUMENT_PUBLIC_SHARE_MUTATION = {
  OPEN: 'open',
  ROTATE: 'rotate',
  REVOKE: 'revoke',
} as const

export const DOCUMENT_PUBLIC_SHARE_TRANSITION = {
  CREATE: 'create',
  ROTATE: 'rotate',
  REVOKE: 'revoke',
  REPLAY: 'replay',
  INVALID: 'invalid',
} as const

export const DOCUMENT_PUBLIC_SHARE_TOKEN_BYTES = 32
export const DOCUMENT_PUBLIC_SHARE_TOKEN_LENGTH = 43
export const DOCUMENT_PUBLIC_SHARE_TOKEN_HASH_LENGTH = 64
export const DOCUMENT_PUBLIC_SHARE_URL_MAX_LENGTH = 2_048

