import {
  createVersionedSecretCrypto,
  type VersionedSecretConfig,
  type VersionedSecretEnvelope,
} from '../encryption/versioned-secret'

export type CredentialSecretContext = Readonly<{
  projectId: string
  categoryId: string
  credentialId: string
  field: string
}>

export type CredentialSecretEnvelope = VersionedSecretEnvelope

export class CredentialDecryptionError extends Error {
  constructor() {
    super('Credential value unavailable')
    this.name = 'CredentialDecryptionError'
  }
}

export const serializeCredentialSecretContext = (context: CredentialSecretContext): string => [
  'minerva:credential:v1',
  context.projectId,
  context.categoryId,
  context.credentialId,
  context.field,
].join('|')

export const createCredentialCrypto = (config: VersionedSecretConfig) => {
  const crypto = createVersionedSecretCrypto(config, serializeCredentialSecretContext)
  return Object.freeze({
    encrypt: crypto.encrypt,
    decrypt(envelope: CredentialSecretEnvelope, context: CredentialSecretContext): string {
      try {
        return crypto.decrypt(envelope, context)
      }
      catch {
        throw new CredentialDecryptionError()
      }
    },
  })
}
