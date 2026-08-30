import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import {
  AUDIT_OUTCOME,
  PROJECT_ICON_MAX_BYTES,
  PROJECT_ICON_MIME_TYPE,
  PROJECT_PERMISSION,
} from '../../../shared/projects/constants'
import type { ProjectIconResponse } from '../../../shared/projects/contracts'
import type { AuditChannel, ProjectIconMimeType } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { projectIcons } from '../../infrastructure/database/schema/files'
import {
  auditEvents,
  projects,
} from '../../infrastructure/database/schema/projects'
import { hasProjectPermission } from './project-access'
import {
  createS3PrivateObjectStorage,
  type PrivateObject,
  type PrivateObjectStorage,
} from '../../infrastructure/storage/s3-private-objects'

export const PROJECT_ICON_ERROR = {
  INVALID_IMAGE: 'INVALID_IMAGE',
  NOT_FOUND: 'NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

type ProjectIconError = typeof PROJECT_ICON_ERROR[keyof typeof PROJECT_ICON_ERROR]
type ProjectDatabase = ReturnType<typeof getDatabase>['db']

export interface ProjectIconUploadCandidate {
  readonly mimeType: string
  readonly bytes: Buffer
}

interface ValidProjectIconUpload {
  readonly mimeType: ProjectIconMimeType
  readonly bytes: Buffer
}

type ProjectIconValidationResult =
  | { readonly ok: true, readonly value: ValidProjectIconUpload }
  | { readonly ok: false, readonly code: typeof PROJECT_ICON_ERROR.INVALID_IMAGE }

const startsWith = (bytes: Buffer, signature: readonly number[]): boolean =>
  signature.every((value, index) => bytes[index] === value)

const hasValidSignature = (mimeType: ProjectIconMimeType, bytes: Buffer): boolean => {
  if (mimeType === PROJECT_ICON_MIME_TYPE.PNG) {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  }
  if (mimeType === PROJECT_ICON_MIME_TYPE.JPEG) return startsWith(bytes, [0xff, 0xd8, 0xff])
  return startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

const isProjectIconMimeType = (value: string): value is ProjectIconMimeType =>
  Object.values(PROJECT_ICON_MIME_TYPE).some(mimeType => mimeType === value)

export const validateProjectIconUpload = (candidate: ProjectIconUploadCandidate): ProjectIconValidationResult => {
  if (
    candidate.bytes.length === 0
    || candidate.bytes.length > PROJECT_ICON_MAX_BYTES
    || !isProjectIconMimeType(candidate.mimeType)
    || !hasValidSignature(candidate.mimeType, candidate.bytes)
  ) {
    return { ok: false, code: PROJECT_ICON_ERROR.INVALID_IMAGE }
  }
  return { ok: true, value: { mimeType: candidate.mimeType, bytes: candidate.bytes } }
}

export const projectIconObjectKey = (projectId: string, iconId: string): string =>
  `projects/${projectId}/icons/${iconId}`

interface ProjectIconCommand {
  readonly actorUserId: string
  readonly projectId: string
  readonly channel: AuditChannel
}

export interface UploadProjectIconInput extends ProjectIconCommand, ProjectIconUploadCandidate {}

export type ProjectIconMutationResult =
  | { readonly ok: true, readonly value: ProjectIconResponse }
  | { readonly ok: false, readonly code: ProjectIconError }

export const uploadProjectIconWith = (
  db: ProjectDatabase,
  storage: PrivateObjectStorage,
  createId: () => string = randomUUID,
) => async (input: UploadProjectIconInput): Promise<ProjectIconMutationResult> => {
  const validation = validateProjectIconUpload(input)
  if (!validation.ok) return validation
  if (!await hasProjectPermission(db, input.projectId, input.actorUserId, PROJECT_PERMISSION.PROJECT_UPDATE)) {
    return { ok: false, code: PROJECT_ICON_ERROR.NOT_FOUND }
  }

  const iconId = createId()
  const objectKey = projectIconObjectKey(input.projectId, iconId)
  try {
    await storage.put(objectKey, validation.value.bytes, validation.value.mimeType)
    let replacedObjectKey: string | null = null
    try {
      await db.transaction(async (tx) => {
        const [existing] = await tx.select({ objectKey: projectIcons.objectKey })
          .from(projectIcons)
          .where(eq(projectIcons.projectId, input.projectId))
          .limit(1)
        replacedObjectKey = existing?.objectKey ?? null
        await tx.insert(projectIcons).values({
          id: iconId,
          projectId: input.projectId,
          objectKey,
          mimeType: validation.value.mimeType,
          byteSize: validation.value.bytes.length,
          updatedByUserId: input.actorUserId,
        }).onConflictDoUpdate({
          target: projectIcons.projectId,
          set: {
            id: iconId,
            objectKey,
            mimeType: validation.value.mimeType,
            byteSize: validation.value.bytes.length,
            updatedByUserId: input.actorUserId,
            updatedAt: new Date(),
          },
        })
        await tx.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, input.projectId))
        await tx.insert(auditEvents).values({
          actorUserId: input.actorUserId,
          channel: input.channel,
          action: 'project.icon_updated',
          outcome: AUDIT_OUTCOME.SUCCEEDED,
          projectId: input.projectId,
          targetType: 'project_icon',
          targetId: iconId,
          metadata: { mimeType: validation.value.mimeType, byteSize: validation.value.bytes.length },
        })
      })
    }
    catch (error: unknown) {
      await storage.remove(objectKey).catch(() => undefined)
      throw error
    }
    if (replacedObjectKey !== null) await storage.remove(replacedObjectKey).catch(() => undefined)
    return { ok: true, value: { iconId } }
  }
  catch {
    return { ok: false, code: PROJECT_ICON_ERROR.OPERATION_FAILED }
  }
}

export interface ReadProjectIconInput {
  readonly actorUserId: string
  readonly projectId: string
}

export const readProjectIconWith = (db: ProjectDatabase, storage: PrivateObjectStorage) =>
  async (input: ReadProjectIconInput): Promise<PrivateObject | null> => {
    if (!await hasProjectPermission(db, input.projectId, input.actorUserId, PROJECT_PERMISSION.PROJECT_VIEW)) return null
    const [metadata] = await db.select({ objectKey: projectIcons.objectKey, mimeType: projectIcons.mimeType })
      .from(projectIcons)
      .where(eq(projectIcons.projectId, input.projectId))
      .limit(1)
    if (!metadata) return null
    const object = await storage.get(metadata.objectKey)
    return object === null ? null : { ...object, mimeType: metadata.mimeType }
  }

export const deleteProjectIconWith = (db: ProjectDatabase, storage: PrivateObjectStorage) =>
  async (input: ProjectIconCommand): Promise<ProjectIconMutationResult> => {
    if (!await hasProjectPermission(db, input.projectId, input.actorUserId, PROJECT_PERMISSION.PROJECT_UPDATE)) {
      return { ok: false, code: PROJECT_ICON_ERROR.NOT_FOUND }
    }
    try {
      let removedObjectKey: string | null = null
      await db.transaction(async (tx) => {
        const [removed] = await tx.delete(projectIcons)
          .where(eq(projectIcons.projectId, input.projectId))
          .returning({ id: projectIcons.id, objectKey: projectIcons.objectKey })
        removedObjectKey = removed?.objectKey ?? null
        if (removed) {
          await tx.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, input.projectId))
          await tx.insert(auditEvents).values({
            actorUserId: input.actorUserId,
            channel: input.channel,
            action: 'project.icon_removed',
            outcome: AUDIT_OUTCOME.SUCCEEDED,
            projectId: input.projectId,
            targetType: 'project_icon',
            targetId: removed.id,
            metadata: {},
          })
        }
      })
      if (removedObjectKey !== null) await storage.remove(removedObjectKey).catch(() => undefined)
      return { ok: true, value: { iconId: null } }
    }
    catch {
      return { ok: false, code: PROJECT_ICON_ERROR.OPERATION_FAILED }
    }
  }

const currentStorage = () => createS3PrivateObjectStorage()

export const uploadProjectIcon = (input: UploadProjectIconInput) =>
  uploadProjectIconWith(getDatabase().db, currentStorage())(input)
export const readProjectIcon = (input: ReadProjectIconInput) =>
  readProjectIconWith(getDatabase().db, currentStorage())(input)
export const deleteProjectIcon = (input: ProjectIconCommand) =>
  deleteProjectIconWith(getDatabase().db, currentStorage())(input)
