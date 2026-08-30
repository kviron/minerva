import { randomBytes } from 'node:crypto'
import {
  DOCUMENT_PUBLIC_SHARE_TOKEN_BYTES,
} from '../../../shared/documents/public-share-constants'
import {
  createVersionedSecretCrypto,
  type VersionedSecretConfig,
  type VersionedSecretEnvelope,
} from '../encryption/versioned-secret'

export interface DocumentPublicShareSecretContext {
  readonly projectId: string
  readonly rootDocumentId: string
  readonly shareId: string
}

export type DocumentPublicShareSecretEnvelope = VersionedSecretEnvelope

export class DocumentPublicShareDecryptionError extends Error {
  constructor() {
    super('Public document share unavailable')
    this.name = 'DocumentPublicShareDecryptionError'
  }
}

export const serializeDocumentPublicShareSecretContext = (
  context: DocumentPublicShareSecretContext,
): string => [
  'minerva:document-public-share:v1',
  context.projectId,
  context.rootDocumentId,
  context.shareId,
  'capability-token',
].join('|')

export const createDocumentPublicShareCrypto = (config: VersionedSecretConfig) => {
  const crypto = createVersionedSecretCrypto(config, serializeDocumentPublicShareSecretContext)
  const generateRandom = config.random ?? randomBytes
  return Object.freeze({
    encrypt: crypto.encrypt,
    randomToken(): string {
      const bytes = Buffer.from(generateRandom(DOCUMENT_PUBLIC_SHARE_TOKEN_BYTES))
      if (bytes.length !== DOCUMENT_PUBLIC_SHARE_TOKEN_BYTES) {
        throw new Error('Public document share token must contain 32 random bytes')
      }
      return bytes.toString('base64url')
    },
    decrypt(
      envelope: DocumentPublicShareSecretEnvelope,
      context: DocumentPublicShareSecretContext,
    ): string {
      try {
        return crypto.decrypt(envelope, context)
      }
      catch {
        throw new DocumentPublicShareDecryptionError()
      }
    },
  })
}

