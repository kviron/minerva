import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const NONCE_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export interface VersionedSecretEnvelope {
  readonly ciphertext: string
  readonly nonce: string
  readonly keyVersion: number
}

export interface VersionedSecretConfig {
  readonly activeVersion: number
  readonly keys: ReadonlyMap<number, Uint8Array>
  readonly random?: (size: number) => Uint8Array
}

export class VersionedSecretDecryptionError extends Error {
  constructor() {
    super('Encrypted value unavailable')
    this.name = 'VersionedSecretDecryptionError'
  }
}

const validatedKeys = (config: VersionedSecretConfig): ReadonlyMap<number, Buffer> => {
  const keys = new Map<number, Buffer>()
  for (const [version, value] of config.keys) {
    const key = Buffer.from(value)
    if (!Number.isSafeInteger(version) || version < 1 || key.length !== 32)
      throw new Error('Encryption keys must use positive versions and contain 32 bytes')
    keys.set(version, key)
  }
  if (!keys.has(config.activeVersion))
    throw new Error('Encryption active key version is unavailable')
  return keys
}

export const createVersionedSecretCrypto = <Context>(
  config: VersionedSecretConfig,
  serializeContext: (context: Context) => string,
) => {
  const keys = validatedKeys(config)
  const activeKey = keys.get(config.activeVersion)
  if (!activeKey) throw new Error('Encryption active key version is unavailable')
  const generateRandom = config.random ?? randomBytes

  return Object.freeze({
    encrypt(plaintext: string, context: Context): VersionedSecretEnvelope {
      const nonce = Buffer.from(generateRandom(NONCE_LENGTH))
      if (nonce.length !== NONCE_LENGTH)
        throw new Error('Encryption nonce must contain 12 bytes')
      const cipher = createCipheriv(ALGORITHM, activeKey, nonce)
      cipher.setAAD(Buffer.from(serializeContext(context), 'utf8'))
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final(), cipher.getAuthTag()])
      return Object.freeze({
        ciphertext: encrypted.toString('base64'),
        nonce: nonce.toString('base64'),
        keyVersion: config.activeVersion,
      })
    },

    decrypt(envelope: VersionedSecretEnvelope, context: Context): string {
      try {
        const key = keys.get(envelope.keyVersion)
        const nonce = Buffer.from(envelope.nonce, 'base64')
        const encrypted = Buffer.from(envelope.ciphertext, 'base64')
        if (!key || nonce.length !== NONCE_LENGTH || encrypted.length <= AUTH_TAG_LENGTH)
          throw new Error('invalid envelope')
        const ciphertext = encrypted.subarray(0, -AUTH_TAG_LENGTH)
        const tag = encrypted.subarray(-AUTH_TAG_LENGTH)
        const decipher = createDecipheriv(ALGORITHM, key, nonce)
        decipher.setAAD(Buffer.from(serializeContext(context), 'utf8'))
        decipher.setAuthTag(tag)
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
      }
      catch {
        throw new VersionedSecretDecryptionError()
      }
    },
  })
}
