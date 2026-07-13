import type { CREDENTIAL_FIELD_TYPE } from './constants'

export type CredentialFieldType = typeof CREDENTIAL_FIELD_TYPE[keyof typeof CREDENTIAL_FIELD_TYPE]
