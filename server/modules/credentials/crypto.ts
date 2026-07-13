import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const NONCE_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export type CredentialSecretContext = Readonly<{
  projectId: string
  categoryId: string
  credentialId: string
  field: string
}>

export type CredentialSecretEnvelope = Readonly<{
  ciphertext: string
  nonce: string
  keyVersion: number
}>

type CredentialCryptoConfig = Readonly<{
  activeVersion: number
  keys: ReadonlyMap<number, Uint8Array>
  random?: (size: number) => Uint8Array
}>

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

const validatedKeys = (config: CredentialCryptoConfig): ReadonlyMap<number, Buffer> => {
  const keys = new Map<number, Buffer>()
  for (const [version, value] of config.keys) {
    const key = Buffer.from(value)
    if (!Number.isSafeInteger(version) || version < 1 || key.length !== 32)
      throw new Error('Credential encryption keys must use positive versions and contain 32 bytes')
    keys.set(version, key)
  }
  if (!keys.has(config.activeVersion))
    throw new Error('Credential encryption active key version is unavailable')
  return keys
}

export const createCredentialCrypto = (config: CredentialCryptoConfig) => {
  const keys = validatedKeys(config)
  const generateRandom = config.random ?? randomBytes

  return Object.freeze({
    encrypt(plaintext: string, context: CredentialSecretContext): CredentialSecretEnvelope {
      const nonce = Buffer.from(generateRandom(NONCE_LENGTH))
      if (nonce.length !== NONCE_LENGTH)
        throw new Error('Credential encryption nonce must contain 12 bytes')
      const cipher = createCipheriv(ALGORITHM, keys.get(config.activeVersion)!, nonce)
      cipher.setAAD(Buffer.from(serializeCredentialSecretContext(context), 'utf8'))
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final(), cipher.getAuthTag()])
      return Object.freeze({
        ciphertext: encrypted.toString('base64'),
        nonce: nonce.toString('base64'),
        keyVersion: config.activeVersion,
      })
    },

    decrypt(envelope: CredentialSecretEnvelope, context: CredentialSecretContext): string {
      try {
        const key = keys.get(envelope.keyVersion)
        const nonce = Buffer.from(envelope.nonce, 'base64')
        const encrypted = Buffer.from(envelope.ciphertext, 'base64')
        if (!key || nonce.length !== NONCE_LENGTH || encrypted.length <= AUTH_TAG_LENGTH)
          throw new Error('invalid envelope')
        const ciphertext = encrypted.subarray(0, -AUTH_TAG_LENGTH)
        const tag = encrypted.subarray(-AUTH_TAG_LENGTH)
        const decipher = createDecipheriv(ALGORITHM, key, nonce)
        decipher.setAAD(Buffer.from(serializeCredentialSecretContext(context), 'utf8'))
        decipher.setAuthTag(tag)
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
      }
      catch {
        throw new CredentialDecryptionError()
      }
    },
  })
}
