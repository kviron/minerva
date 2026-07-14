import { and, desc, eq, inArray, isNull, max, sql } from 'drizzle-orm'
import type {
  DocumentContent,
  DocumentVersionDetail,
  DocumentVersionSummary,
  RestoreDocumentVersionResponse,
} from '../../../shared/documents/contracts'
import { DOCUMENT_PUBLICATION_STATE } from '../../../shared/documents/constants'
import { AUDIT_OUTCOME, MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel, ProjectPermission } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import { documents, documentVersions } from '../../infrastructure/database/schema/documents'
import { auditEvents, projectMemberships, projectRolePermissions } from '../../infrastructure/database/schema/projects'

export const DOCUMENT_VERSION_ERROR = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  DRAFT_CONFLICT: 'DRAFT_CONFLICT',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const

export type DocumentVersionErrorCode = typeof DOCUMENT_VERSION_ERROR[keyof typeof DOCUMENT_VERSION_ERROR]

interface DocumentVersionBaseInput {
  readonly actorUserId: string
  readonly projectId: string
  readonly documentId: string
  readonly channel: AuditChannel
}

export interface PublishDocumentInput extends DocumentVersionBaseInput {
  readonly changeSummary?: string
  readonly expectedRevision: number
}

export interface ValidPublishDocumentCommand extends DocumentVersionBaseInput {
  readonly changeSummary: string
  readonly expectedRevision: number
}

export interface RestoreDocumentVersionInput extends DocumentVersionBaseInput {
  readonly versionNumber: number
  readonly expectedRevision: number
}

type ValidationResult<T> =
  | { readonly ok: true, readonly value: T }
  | { readonly ok: false, readonly code: typeof DOCUMENT_VERSION_ERROR.INVALID_REQUEST }

type PublishPersistenceResult =
  | { readonly ok: true, readonly versionNumber: number, readonly publishedAt: string }
  | { readonly ok: false, readonly code: typeof DOCUMENT_VERSION_ERROR.NOT_FOUND | typeof DOCUMENT_VERSION_ERROR.DRAFT_CONFLICT }

type RestorePersistenceResult =
  | ({ readonly ok: true } & RestoreDocumentVersionResponse)
  | { readonly ok: false, readonly code: typeof DOCUMENT_VERSION_ERROR.NOT_FOUND | typeof DOCUMENT_VERSION_ERROR.DRAFT_CONFLICT }

export type PublishDocumentResult =
  | { readonly ok: true, readonly value: { readonly versionNumber: number, readonly publishedAt: string } }
  | { readonly ok: false, readonly code: DocumentVersionErrorCode }

export type RestoreDocumentVersionResult =
  | { readonly ok: true, readonly value: RestoreDocumentVersionResponse }
  | { readonly ok: false, readonly code: DocumentVersionErrorCode }

export interface PublishDocumentDependencies {
  readonly publish: (command: ValidPublishDocumentCommand) => Promise<PublishPersistenceResult>
}

export interface RestoreDocumentVersionDependencies {
  readonly restore: (command: RestoreDocumentVersionInput) => Promise<RestorePersistenceResult>
}

type DocumentsDatabase = ReturnType<typeof getDatabase>['db']

export const validatePublishDocument = (input: PublishDocumentInput): ValidationResult<ValidPublishDocumentCommand> => {
  const changeSummary = input.changeSummary?.trim() ?? ''
  if (
    changeSummary.length > 1000
    || !Number.isInteger(input.expectedRevision)
    || input.expectedRevision < 0
  ) {
    return { ok: false, code: DOCUMENT_VERSION_ERROR.INVALID_REQUEST }
  }
  return { ok: true, value: { ...input, changeSummary } }
}

export const validateRestoreDocumentVersion = (
  input: RestoreDocumentVersionInput,
): ValidationResult<RestoreDocumentVersionInput> => {
  if (
    !Number.isInteger(input.versionNumber)
    || input.versionNumber < 1
    || !Number.isInteger(input.expectedRevision)
    || input.expectedRevision < 0
  ) {
    return { ok: false, code: DOCUMENT_VERSION_ERROR.INVALID_REQUEST }
  }
  return { ok: true, value: input }
}

const membershipPermissionRows = async (
  db: DocumentsDatabase,
  projectId: string,
  actorUserId: string,
  permissions: readonly ProjectPermission[],
) => db.select({ permissionCode: projectRolePermissions.permissionCode })
  .from(projectMemberships)
  .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
  .where(and(
    eq(projectMemberships.projectId, projectId),
    eq(projectMemberships.userId, actorUserId),
    eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
    inArray(projectRolePermissions.permissionCode, permissions),
  ))

export const publishDocumentPersistence = (db: DocumentsDatabase): PublishDocumentDependencies['publish'] =>
  command => db.transaction(async (tx): Promise<PublishPersistenceResult> => {
    const permissions = await tx.select({ permissionCode: projectRolePermissions.permissionCode })
      .from(projectMemberships)
      .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
      .where(and(
        eq(projectMemberships.projectId, command.projectId),
        eq(projectMemberships.userId, command.actorUserId),
        eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
        eq(projectRolePermissions.permissionCode, PROJECT_PERMISSION.DOCUMENTS_PUBLISH),
      ))
    if (!permissions.some(row => row.permissionCode === PROJECT_PERMISSION.DOCUMENTS_PUBLISH)) {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.NOT_FOUND }
    }

    const [document] = await tx.select({
      title: documents.title,
      draftRevision: documents.draftRevision,
      content: documents.draftContent,
      internalLinkTargetIds: documents.draftInternalLinkTargetIds,
      referencedImageIds: documents.draftReferencedImageIds,
    }).from(documents).where(and(
      eq(documents.id, command.documentId),
      eq(documents.projectId, command.projectId),
      isNull(documents.archivedAt),
    )).for('update').limit(1)
    if (!document) {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.NOT_FOUND }
    }
    if (document.draftRevision !== command.expectedRevision) {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.DRAFT_CONFLICT }
    }

    const [latest] = await tx.select({ versionNumber: max(documentVersions.versionNumber) })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, command.documentId))
    const versionNumber = (latest?.versionNumber ?? 0) + 1
    const publishedAt = new Date()
    await tx.insert(documentVersions).values({
      projectId: command.projectId,
      documentId: command.documentId,
      versionNumber,
      sourceDraftRevision: document.draftRevision,
      title: document.title,
      draftContent: document.content,
      internalLinkTargetIds: document.internalLinkTargetIds,
      referencedImageIds: document.referencedImageIds,
      changeSummary: command.changeSummary,
      publishedByUserId: command.actorUserId,
      publishedAt,
    })
    await tx.update(documents).set({
      publicationState: DOCUMENT_PUBLICATION_STATE.PUBLISHED,
      updatedAt: publishedAt,
    }).where(and(eq(documents.id, command.documentId), eq(documents.projectId, command.projectId)))
    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'document.published',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: command.projectId,
      targetType: 'document',
      targetId: command.documentId,
      metadata: { versionNumber, draftRevision: document.draftRevision, summaryLength: command.changeSummary.length },
    })
    return { ok: true, versionNumber, publishedAt: publishedAt.toISOString() }
  })

export const publishDocumentWith = (dependencies: PublishDocumentDependencies) =>
  async (input: PublishDocumentInput): Promise<PublishDocumentResult> => {
    const validation = validatePublishDocument(input)
    if (!validation.ok) {
      return validation
    }
    try {
      const result = await dependencies.publish(validation.value)
      return result.ok
        ? { ok: true, value: { versionNumber: result.versionNumber, publishedAt: result.publishedAt } }
        : result
    }
    catch {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.OPERATION_FAILED }
    }
  }

export const publishDocument = (input: PublishDocumentInput) =>
  publishDocumentWith({ publish: publishDocumentPersistence(getDatabase().db) })(input)

const hasHistoryPermission = async (db: DocumentsDatabase, projectId: string, actorUserId: string): Promise<boolean> => {
  const permissions = await membershipPermissionRows(
    db,
    projectId,
    actorUserId,
    [PROJECT_PERMISSION.DOCUMENTS_VIEW_HISTORY],
  )
  return permissions.some(row => row.permissionCode === PROJECT_PERMISSION.DOCUMENTS_VIEW_HISTORY)
}

export const listDocumentVersionsForUser = async (
  db: DocumentsDatabase,
  projectId: string,
  documentId: string,
  actorUserId: string,
): Promise<readonly DocumentVersionSummary[] | null> => {
  if (!await hasHistoryPermission(db, projectId, actorUserId)) {
    return null
  }
  const [document] = await db.select({ id: documents.id }).from(documents).where(and(
    eq(documents.id, documentId),
    eq(documents.projectId, projectId),
    isNull(documents.archivedAt),
  )).limit(1)
  if (!document) {
    return null
  }
  const rows = await db.select({
    versionNumber: documentVersions.versionNumber,
    sourceDraftRevision: documentVersions.sourceDraftRevision,
    title: documentVersions.title,
    changeSummary: documentVersions.changeSummary,
    publishedByName: user.name,
    publishedAt: documentVersions.publishedAt,
  }).from(documentVersions)
    .innerJoin(user, eq(documentVersions.publishedByUserId, user.id))
    .where(and(eq(documentVersions.projectId, projectId), eq(documentVersions.documentId, documentId)))
    .orderBy(desc(documentVersions.versionNumber))
  return rows.map(row => ({ ...row, publishedAt: row.publishedAt.toISOString() }))
}

export const getDocumentVersionForUser = async (
  db: DocumentsDatabase,
  projectId: string,
  documentId: string,
  versionNumber: number,
  actorUserId: string,
): Promise<DocumentVersionDetail | null> => {
  if (!Number.isInteger(versionNumber) || versionNumber < 1 || !await hasHistoryPermission(db, projectId, actorUserId)) {
    return null
  }
  const [row] = await db.select({
    versionNumber: documentVersions.versionNumber,
    sourceDraftRevision: documentVersions.sourceDraftRevision,
    title: documentVersions.title,
    changeSummary: documentVersions.changeSummary,
    publishedByName: user.name,
    publishedAt: documentVersions.publishedAt,
    content: documentVersions.draftContent,
  }).from(documentVersions)
    .innerJoin(user, eq(documentVersions.publishedByUserId, user.id))
    .where(and(
      eq(documentVersions.projectId, projectId),
      eq(documentVersions.documentId, documentId),
      eq(documentVersions.versionNumber, versionNumber),
    )).limit(1)
  return row ? { ...row, publishedAt: row.publishedAt.toISOString() } : null
}

export const restoreDocumentVersionPersistence = (db: DocumentsDatabase): RestoreDocumentVersionDependencies['restore'] =>
  command => db.transaction(async (tx): Promise<RestorePersistenceResult> => {
    const permissions = await tx.select({ permissionCode: projectRolePermissions.permissionCode })
      .from(projectMemberships)
      .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
      .where(and(
        eq(projectMemberships.projectId, command.projectId),
        eq(projectMemberships.userId, command.actorUserId),
        eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
        inArray(projectRolePermissions.permissionCode, [
          PROJECT_PERMISSION.DOCUMENTS_VIEW_HISTORY,
          PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT,
        ]),
      ))
    const granted = new Set(permissions.map(row => row.permissionCode))
    if (
      !granted.has(PROJECT_PERMISSION.DOCUMENTS_VIEW_HISTORY)
      || !granted.has(PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT)
    ) {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.NOT_FOUND }
    }
    const [document] = await tx.select({ draftRevision: documents.draftRevision }).from(documents).where(and(
      eq(documents.id, command.documentId),
      eq(documents.projectId, command.projectId),
      isNull(documents.archivedAt),
    )).for('update').limit(1)
    if (!document) {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.NOT_FOUND }
    }
    if (document.draftRevision !== command.expectedRevision) {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.DRAFT_CONFLICT }
    }
    const [version] = await tx.select({
      title: documentVersions.title,
      content: documentVersions.draftContent,
      internalLinkTargetIds: documentVersions.internalLinkTargetIds,
      referencedImageIds: documentVersions.referencedImageIds,
    }).from(documentVersions).where(and(
      eq(documentVersions.projectId, command.projectId),
      eq(documentVersions.documentId, command.documentId),
      eq(documentVersions.versionNumber, command.versionNumber),
    )).limit(1)
    if (!version) {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.NOT_FOUND }
    }
    const updatedAt = new Date()
    const [updated] = await tx.update(documents).set({
      title: version.title,
      draftContent: version.content,
      draftInternalLinkTargetIds: version.internalLinkTargetIds,
      draftReferencedImageIds: version.referencedImageIds,
      draftRevision: sql`${documents.draftRevision} + 1`,
      publicationState: DOCUMENT_PUBLICATION_STATE.DRAFT,
      updatedAt,
    }).where(and(
      eq(documents.id, command.documentId),
      eq(documents.projectId, command.projectId),
      eq(documents.draftRevision, command.expectedRevision),
    )).returning({ draftRevision: documents.draftRevision })
    if (!updated) {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.DRAFT_CONFLICT }
    }
    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'document.version_restored',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: command.projectId,
      targetType: 'document',
      targetId: command.documentId,
      metadata: { versionNumber: command.versionNumber, draftRevision: updated.draftRevision },
    })
    return {
      ok: true,
      draftRevision: updated.draftRevision,
      updatedAt: updatedAt.toISOString(),
      title: version.title,
      content: version.content,
    }
  })

export const restoreDocumentVersionWith = (dependencies: RestoreDocumentVersionDependencies) =>
  async (input: RestoreDocumentVersionInput): Promise<RestoreDocumentVersionResult> => {
    const validation = validateRestoreDocumentVersion(input)
    if (!validation.ok) {
      return validation
    }
    try {
      const result = await dependencies.restore(validation.value)
      return result.ok
        ? { ok: true, value: {
            draftRevision: result.draftRevision,
            updatedAt: result.updatedAt,
            title: result.title,
            content: result.content,
          } }
        : result
    }
    catch {
      return { ok: false, code: DOCUMENT_VERSION_ERROR.OPERATION_FAILED }
    }
  }

export const restoreDocumentVersion = (input: RestoreDocumentVersionInput) =>
  restoreDocumentVersionWith({ restore: restoreDocumentVersionPersistence(getDatabase().db) })(input)
