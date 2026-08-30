import { readFileSync } from 'node:fs'
import {
  parseCredentialEncryptionEnv,
  parseObjectStorageEnv,
  parseServerEnv,
  type CredentialEncryptionEnv,
  type ObjectStorageEnv,
  type ServerEnv,
} from '../../shared/config/env'
import { resolveSecretFileValues } from './secret-files'

const SERVER_SECRET_KEYS = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'RATE_LIMIT_HMAC_SECRET',
] as const
const CREDENTIAL_SECRET_KEYS = ['CREDENTIAL_ENCRYPTION_KEYS'] as const
const OBJECT_STORAGE_SECRET_KEYS = ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const

const readSecretFile = (path: string): string => readFileSync(path, 'utf8')

let cachedServerEnv: ServerEnv | undefined
let cachedCredentialEncryptionEnv: CredentialEncryptionEnv | undefined
let cachedObjectStorageEnv: ObjectStorageEnv | undefined

export const getServerEnv = (): ServerEnv => cachedServerEnv ??= parseServerEnv(
  resolveSecretFileValues(process.env, SERVER_SECRET_KEYS, readSecretFile),
)

export const getCredentialEncryptionEnv = (): CredentialEncryptionEnv => cachedCredentialEncryptionEnv
  ??= parseCredentialEncryptionEnv(
    resolveSecretFileValues(process.env, CREDENTIAL_SECRET_KEYS, readSecretFile),
  )

export const getObjectStorageEnv = (): ObjectStorageEnv => cachedObjectStorageEnv ??= parseObjectStorageEnv(
  resolveSecretFileValues(process.env, OBJECT_STORAGE_SECRET_KEYS, readSecretFile),
)

export const initializeRuntimeConfiguration = (): void => {
  getServerEnv()
  getCredentialEncryptionEnv()
  getObjectStorageEnv()
}

