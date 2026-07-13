import type { CredentialFieldType } from '../../../../../shared/credentials/types'

export type SecretOperation = { kind: 'keep' } | { kind: 'clear' } | { kind: 'replace', value: string }
export type CredentialUpdateBody = {
  categoryId: string
  title: string
  login: SecretOperation
  password: SecretOperation
  fields: { id?: string, label: string, type: CredentialFieldType, value: SecretOperation }[]
}
export type CredentialCreateBody = Readonly<{
  categoryId: string
  title: string
  login: string | null
  password: string | null
  fields: { label: string, type: CredentialFieldType, value: string }[]
}>
