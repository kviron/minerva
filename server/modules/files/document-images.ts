export const DOCUMENT_IMAGE_ERROR = {
  INVALID_IMAGE: 'INVALID_IMAGE',
  NOT_FOUND: 'NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

export const DOCUMENT_IMAGE_MIME_TYPE = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  GIF: 'image/gif',
  WEBP: 'image/webp',
} as const

export type DocumentImageMimeType = typeof DOCUMENT_IMAGE_MIME_TYPE[keyof typeof DOCUMENT_IMAGE_MIME_TYPE]

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export interface DocumentImageUploadCandidate {
  readonly filename: string
  readonly mimeType: string
  readonly bytes: Buffer
}

export interface ValidDocumentImageUpload {
  readonly filename: string
  readonly mimeType: DocumentImageMimeType
  readonly bytes: Buffer
}

type ValidationResult =
  | { readonly ok: true, readonly value: ValidDocumentImageUpload }
  | { readonly ok: false, readonly code: typeof DOCUMENT_IMAGE_ERROR.INVALID_IMAGE }

const startsWith = (bytes: Buffer, signature: readonly number[]): boolean =>
  signature.every((value, index) => bytes[index] === value)

const hasValidSignature = (mimeType: DocumentImageMimeType, bytes: Buffer): boolean => {
  if (mimeType === DOCUMENT_IMAGE_MIME_TYPE.PNG) return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (mimeType === DOCUMENT_IMAGE_MIME_TYPE.JPEG) return startsWith(bytes, [0xff, 0xd8, 0xff])
  if (mimeType === DOCUMENT_IMAGE_MIME_TYPE.GIF) {
    return startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
      || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  }
  return startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

const isDocumentImageMimeType = (value: string): value is DocumentImageMimeType =>
  Object.values(DOCUMENT_IMAGE_MIME_TYPE).some(mimeType => mimeType === value)

export const validateDocumentImageUpload = (candidate: DocumentImageUploadCandidate): ValidationResult => {
  const filename = candidate.filename.trim()
  if (
    filename.length === 0
    || filename.length > 200
    || candidate.bytes.length === 0
    || candidate.bytes.length > MAX_IMAGE_BYTES
    || !isDocumentImageMimeType(candidate.mimeType)
    || !hasValidSignature(candidate.mimeType, candidate.bytes)
  ) {
    return { ok: false, code: DOCUMENT_IMAGE_ERROR.INVALID_IMAGE }
  }
  return { ok: true, value: { filename, mimeType: candidate.mimeType, bytes: candidate.bytes } }
}

export interface UploadDocumentImageInput extends DocumentImageUploadCandidate {
  readonly actorUserId: string
  readonly projectId: string
  readonly channel: AuditChannel
}

export type UploadDocumentImageResult =
  | { readonly ok: true, readonly value: DocumentImageUploadResponse }
  | { readonly ok: false, readonly code: typeof DOCUMENT_IMAGE_ERROR[keyof typeof DOCUMENT_IMAGE_ERROR] }

export interface ReadDocumentImageInput {
  readonly actorUserId: string
  readonly projectId: string
  readonly imageId: string
}

export interface ReadDocumentImageResult extends DocumentImageObject {
  readonly filename: string
}

type DocumentsDatabase = ReturnType<typeof getDatabase>['db']

const hasPermission = async (
  db: DocumentsDatabase,
  projectId: string,
  actorUserId: string,
  permissionCode: typeof PROJECT_PERMISSION.DOCUMENTS_VIEW | typeof PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT,
): Promise<boolean> => {
  const [access] = await db.select({ id: projectMemberships.id })
    .from(projectMemberships)
    .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.userId, actorUserId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
      eq(projectRolePermissions.permissionCode, permissionCode),
    ))
    .limit(1)
  return access !== undefined
}

export const documentImageObjectKey = (projectId: string, imageId: string): string =>
  `projects/${projectId}/document-images/${imageId}`

export const uploadDocumentImageWith = (db: DocumentsDatabase, storage: DocumentImageStorage) =>
  async (input: UploadDocumentImageInput): Promise<UploadDocumentImageResult> => {
    const validation = validateDocumentImageUpload(input)
    if (!validation.ok) return validation
    try {
      if (!await hasPermission(db, input.projectId, input.actorUserId, PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT)) {
        return { ok: false, code: DOCUMENT_IMAGE_ERROR.NOT_FOUND }
      }
      const id = randomUUID()
      const objectKey = documentImageObjectKey(input.projectId, id)
      await storage.put(objectKey, validation.value.bytes, validation.value.mimeType)
      try {
        await db.transaction(async (tx) => {
          await tx.insert(documentImages).values({
            id,
            projectId: input.projectId,
            objectKey,
            filename: validation.value.filename,
            mimeType: validation.value.mimeType,
            byteSize: validation.value.bytes.length,
            uploadedByUserId: input.actorUserId,
          })
          await tx.insert(auditEvents).values({
            actorUserId: input.actorUserId,
            channel: input.channel,
            action: 'document.image_uploaded',
            outcome: AUDIT_OUTCOME.SUCCEEDED,
            projectId: input.projectId,
            targetType: 'document_image',
            targetId: id,
            metadata: { mimeType: validation.value.mimeType, byteSize: validation.value.bytes.length },
          })
        })
      }
      catch (error: unknown) {
        await storage.remove(objectKey).catch(() => undefined)
        throw error
      }
      return {
        ok: true,
        value: {
          id,
          filename: validation.value.filename,
          mimeType: validation.value.mimeType,
          byteSize: validation.value.bytes.length,
          url: `/api/projects/${input.projectId}/documents/images/${id}`,
        },
      }
    }
    catch {
      return { ok: false, code: DOCUMENT_IMAGE_ERROR.OPERATION_FAILED }
    }
  }

export const uploadDocumentImage = (input: UploadDocumentImageInput): Promise<UploadDocumentImageResult> =>
  uploadDocumentImageWith(getDatabase().db, createS3DocumentImageStorage())(input)

export const readDocumentImageWith = (db: DocumentsDatabase, storage: DocumentImageStorage) =>
  async (input: ReadDocumentImageInput): Promise<ReadDocumentImageResult | null> => {
    if (!await hasPermission(db, input.projectId, input.actorUserId, PROJECT_PERMISSION.DOCUMENTS_VIEW)) return null
    const [metadata] = await db.select({
      objectKey: documentImages.objectKey,
      filename: documentImages.filename,
      mimeType: documentImages.mimeType,
    }).from(documentImages).where(and(
      eq(documentImages.id, input.imageId),
      eq(documentImages.projectId, input.projectId),
    )).limit(1)
    if (!metadata) return null
    const object = await storage.get(metadata.objectKey)
    return object ? { ...object, filename: metadata.filename, mimeType: metadata.mimeType } : null
  }

export const readDocumentImage = (input: ReadDocumentImageInput): Promise<ReadDocumentImageResult | null> =>
  readDocumentImageWith(getDatabase().db, createS3DocumentImageStorage())(input)
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { DocumentImageUploadResponse } from '../../../shared/documents/contracts'
import { AUDIT_OUTCOME, MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { documentImages } from '../../infrastructure/database/schema/files'
import { auditEvents, projectMemberships, projectRolePermissions } from '../../infrastructure/database/schema/projects'
import { createS3DocumentImageStorage, type DocumentImageObject, type DocumentImageStorage } from '../../infrastructure/storage/s3-document-images'
