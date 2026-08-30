import { createHash, randomUUID } from 'node:crypto'
import type {
  DocumentPublicShareListResponse,
  DocumentPublicShareMutationResponse,
  DocumentPublicShareProjection,
} from '../../../shared/documents/public-share-contracts'
import { documentPublicShareTokenSchema } from '../../../shared/documents/public-share-contracts'
import {
  DOCUMENT_PUBLIC_SHARE_SCOPE,
  DOCUMENT_PUBLIC_SHARE_STATUS,
} from '../../../shared/documents/public-share-constants'
import type {
  DocumentPublicShareSecretContext,
  DocumentPublicShareSecretEnvelope,
} from './public-share-crypto'

type ShareScope =
  typeof DOCUMENT_PUBLIC_SHARE_SCOPE[keyof typeof DOCUMENT_PUBLIC_SHARE_SCOPE]

export const DOCUMENT_PUBLIC_SHARE_ERROR = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

type ShareError =
  typeof DOCUMENT_PUBLIC_SHARE_ERROR[keyof typeof DOCUMENT_PUBLIC_SHARE_ERROR]
type Result<Value> =
  | Readonly<{ ok: true, value: Value }>
  | Readonly<{ ok: false, code: ShareError }>

export interface StoredDocumentPublicShare {
  readonly id: string
  readonly projectId: string
  readonly rootDocumentId: string
  readonly scope: ShareScope
  readonly tokenHash: string
  readonly tokenCiphertext: string
  readonly tokenNonce: string
  readonly tokenKeyVersion: number
  readonly createdByUserId: string
  readonly revokedByUserId: string | null
  readonly createdAt: Date
  readonly revokedAt: Date | null
  readonly updatedAt: Date
}

interface ManagementQuery {
  readonly projectId: string
  readonly rootDocumentId: string
  readonly actorUserId: string
}

interface ShareQuery extends ManagementQuery {
  readonly shareId: string
}

export interface CreateManagedDocumentPublicShareCommand extends ManagementQuery {
  readonly id: string
  readonly scope: ShareScope
  readonly tokenHash: string
  readonly tokenCiphertext: string
  readonly tokenNonce: string
  readonly tokenKeyVersion: number
  readonly now: Date
}

export interface RotateManagedDocumentPublicShareCommand extends ManagementQuery {
  readonly previousShareId: string
  readonly replacement: Omit<
    CreateManagedDocumentPublicShareCommand,
    'projectId' | 'rootDocumentId' | 'actorUserId' | 'now'
  >
  readonly now: Date
}

export interface DocumentPublicShareRepository {
  readonly listManaged: (query: ManagementQuery) => Promise<readonly StoredDocumentPublicShare[] | null>
  readonly createManaged: (
    command: CreateManagedDocumentPublicShareCommand,
  ) => Promise<StoredDocumentPublicShare | null>
  readonly loadManaged: (query: ShareQuery) => Promise<StoredDocumentPublicShare | null>
  readonly rotateManaged: (
    command: RotateManagedDocumentPublicShareCommand,
  ) => Promise<StoredDocumentPublicShare | null>
  readonly revokeManaged: (
    command: ShareQuery & Readonly<{ now: Date }>,
  ) => Promise<StoredDocumentPublicShare | null>
}

interface DocumentPublicShareCrypto {
  readonly randomToken: () => string
  readonly encrypt: (
    plaintext: string,
    context: DocumentPublicShareSecretContext,
  ) => DocumentPublicShareSecretEnvelope
  readonly decrypt: (
    envelope: DocumentPublicShareSecretEnvelope,
    context: DocumentPublicShareSecretContext,
  ) => string
}

interface Dependencies {
  readonly repository: DocumentPublicShareRepository
  readonly crypto: DocumentPublicShareCrypto
  readonly publicBaseUrl: string
  readonly createId?: () => string
  readonly now?: () => Date
}

const projection = (record: StoredDocumentPublicShare): DocumentPublicShareProjection => ({
  id: record.id,
  rootDocumentId: record.rootDocumentId,
  scope: record.scope,
  status: record.revokedAt === null
    ? DOCUMENT_PUBLIC_SHARE_STATUS.ACTIVE
    : DOCUMENT_PUBLIC_SHARE_STATUS.REVOKED,
  createdAt: record.createdAt.toISOString(),
  revokedAt: record.revokedAt?.toISOString() ?? null,
})

export const hashDocumentPublicShareToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex')

const secretContext = (record: Pick<
  StoredDocumentPublicShare,
  'id' | 'projectId' | 'rootDocumentId'
>): DocumentPublicShareSecretContext => ({
  projectId: record.projectId,
  rootDocumentId: record.rootDocumentId,
  shareId: record.id,
})

const envelope = (record: StoredDocumentPublicShare): DocumentPublicShareSecretEnvelope => ({
  ciphertext: record.tokenCiphertext,
  nonce: record.tokenNonce,
  keyVersion: record.tokenKeyVersion,
})

const publicOrigin = (value: string): URL => {
  const url = new URL(value)
  if (
    url.protocol !== 'https:'
    && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  ) {
    throw new Error('Public document share origin must use HTTPS')
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Public document share origin must be canonical')
  }
  return url
}

const shareUrl = (origin: URL, token: string): string =>
  new URL(`/share/documentation/${token}`, origin).toString()

export const createDocumentPublicShareManagementService = (dependencies: Dependencies) => {
  const origin = publicOrigin(dependencies.publicBaseUrl)
  const createId = dependencies.createId ?? randomUUID
  const currentTime = dependencies.now ?? (() => new Date())

  const reveal = (
    record: StoredDocumentPublicShare,
  ): Result<DocumentPublicShareMutationResponse> => {
    if (record.revokedAt !== null) {
      return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.INVALID_TRANSITION }
    }
    try {
      const token = dependencies.crypto.decrypt(envelope(record), secretContext(record))
      if (!documentPublicShareTokenSchema.safeParse(token).success) {
        return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.OPERATION_FAILED }
      }
      return {
        ok: true,
        value: { share: projection(record), url: shareUrl(origin, token) },
      }
    }
    catch {
      return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.OPERATION_FAILED }
    }
  }

  const replacement = (
    input: ManagementQuery & Readonly<{ scope: ShareScope }>,
  ): CreateManagedDocumentPublicShareCommand => {
    const id = createId()
    const token = dependencies.crypto.randomToken()
    const context = { projectId: input.projectId, rootDocumentId: input.rootDocumentId, shareId: id }
    const encrypted = dependencies.crypto.encrypt(token, context)
    return {
      projectId: input.projectId,
      rootDocumentId: input.rootDocumentId,
      actorUserId: input.actorUserId,
      scope: input.scope,
      id,
      tokenHash: hashDocumentPublicShareToken(token),
      tokenCiphertext: encrypted.ciphertext,
      tokenNonce: encrypted.nonce,
      tokenKeyVersion: encrypted.keyVersion,
      now: currentTime(),
    }
  }

  return Object.freeze({
    async list(input: ManagementQuery): Promise<Result<DocumentPublicShareListResponse>> {
      try {
        const records = await dependencies.repository.listManaged(input)
        return records === null
          ? { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.NOT_FOUND }
          : { ok: true, value: { shares: records.map(projection) } }
      }
      catch {
        return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.OPERATION_FAILED }
      }
    },

    async open(
      input: ManagementQuery & Readonly<{ scope: ShareScope }>,
    ): Promise<Result<DocumentPublicShareMutationResponse>> {
      try {
        const record = await dependencies.repository.createManaged(replacement(input))
        return record === null
          ? { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.NOT_FOUND }
          : reveal(record)
      }
      catch {
        return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.OPERATION_FAILED }
      }
    },

    async copy(input: ShareQuery): Promise<Result<DocumentPublicShareMutationResponse>> {
      try {
        const record = await dependencies.repository.loadManaged(input)
        return record === null
          ? { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.NOT_FOUND }
          : reveal(record)
      }
      catch {
        return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.OPERATION_FAILED }
      }
    },

    async rotate(input: ShareQuery): Promise<Result<DocumentPublicShareMutationResponse>> {
      try {
        const current = await dependencies.repository.loadManaged(input)
        if (current === null) return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.NOT_FOUND }
        if (current.revokedAt !== null) {
          return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.INVALID_TRANSITION }
        }
        const candidate = replacement({ ...input, scope: current.scope })
        const record = await dependencies.repository.rotateManaged({
          ...input,
          previousShareId: input.shareId,
          replacement: {
            id: candidate.id,
            scope: candidate.scope,
            tokenHash: candidate.tokenHash,
            tokenCiphertext: candidate.tokenCiphertext,
            tokenNonce: candidate.tokenNonce,
            tokenKeyVersion: candidate.tokenKeyVersion,
          },
          now: candidate.now,
        })
        return record === null
          ? { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.NOT_FOUND }
          : reveal(record)
      }
      catch {
        return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.OPERATION_FAILED }
      }
    },

    async revoke(input: ShareQuery): Promise<Result<DocumentPublicShareProjection>> {
      try {
        const record = await dependencies.repository.revokeManaged({ ...input, now: currentTime() })
        return record === null
          ? { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.NOT_FOUND }
          : { ok: true, value: projection(record) }
      }
      catch {
        return { ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.OPERATION_FAILED }
      }
    },
  })
}
