import type { CredentialFieldType } from './types'

export type MaskedCredentialListItem = Readonly<{
  id: string
  title: string
  category: Readonly<{ id: string, name: string }>
  login: string | null
  hasLogin: boolean
  hasPassword: boolean
  dynamicFields: readonly Readonly<{ id: string, label: string, type: CredentialFieldType }>[]
  updatedAt: string
  updatedBy: Readonly<{ name: string, avatar: string | null }>
  canUpdate: boolean
  canArchive: boolean
}>

export type CredentialSecretTarget = 'login' | 'password' | `field:${string}`
