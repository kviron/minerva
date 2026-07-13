import { and, eq, isNull, sql } from 'drizzle-orm'
import { DOCUMENT_DRAFT_UPDATE_CODE } from '../../../shared/documents/constants'
import type { DocumentContent } from '../../../shared/documents/contracts'
import { AUDIT_OUTCOME, MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { documents } from '../../infrastructure/database/schema/documents'
import { auditEvents, projectMemberships, projectRolePermissions } from '../../infrastructure/database/schema/projects'
import { parseDocumentContent } from './content-schema'

export const UPDATE_DOCUMENT_DRAFT_ERROR = {
  INVALID_DRAFT: 'INVALID_DRAFT',
  NOT_FOUND: 'NOT_FOUND',
  DRAFT_CONFLICT: DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT,
  UPDATE_FAILED: 'UPDATE_FAILED',
} as const

export type UpdateDocumentDraftErrorCode = typeof UPDATE_DOCUMENT_DRAFT_ERROR[keyof typeof UPDATE_DOCUMENT_DRAFT_ERROR]

export interface UpdateDocumentDraftInput {
  readonly actorUserId: string
  readonly projectId: string
  readonly documentId: string
  readonly channel: AuditChannel
  readonly title: string
  readonly content: unknown
  readonly expectedRevision: number
}

export interface ValidDocumentDraftUpdate extends Omit<UpdateDocumentDraftInput, 'content'> {
  readonly content: DocumentContent
}

type ValidationResult =
  | { readonly ok: true, readonly value: ValidDocumentDraftUpdate }
  | { readonly ok: false, readonly code: typeof UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT }

type PersistenceResult =
  | { readonly ok: true, readonly draftRevision: number, readonly updatedAt: string }
  | { readonly ok: false, readonly code: typeof UPDATE_DOCUMENT_DRAFT_ERROR.NOT_FOUND | typeof UPDATE_DOCUMENT_DRAFT_ERROR.DRAFT_CONFLICT }

export type UpdateDocumentDraftResult =
  | { readonly ok: true, readonly value: { readonly draftRevision: number, readonly updatedAt: string } }
  | { readonly ok: false, readonly code: UpdateDocumentDraftErrorCode }

export interface UpdateDocumentDraftDependencies {
  readonly persist: (command: ValidDocumentDraftUpdate) => Promise<PersistenceResult>
}

type DocumentsDatabase = ReturnType<typeof getDatabase>['db']

export const validateDocumentDraftUpdate = (input: UpdateDocumentDraftInput): ValidationResult => {
  const title = input.title.trim()
  const content = parseDocumentContent(input.content)
  if (
    title.length === 0
    || title.length > 200
    || !Number.isInteger(input.expectedRevision)
    || input.expectedRevision < 0
    || content === null
  ) {
    return { ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT }
  }
  return { ok: true, value: { ...input, title, content } }
}

export const updateDocumentDraftPersistence = (db: DocumentsDatabase): UpdateDocumentDraftDependencies['persist'] =>
  command => db.transaction(async (tx): Promise<PersistenceResult> => {
    const [access] = await tx.select({ membershipId: projectMemberships.id })
      .from(projectMemberships)
      .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
      .where(and(
        eq(projectMemberships.projectId, command.projectId),
        eq(projectMemberships.userId, command.actorUserId),
        eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
        eq(projectRolePermissions.permissionCode, PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT),
      ))
      .limit(1)
    if (!access) {
      return { ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.NOT_FOUND }
    }

    const updatedAt = new Date()
    const [updated] = await tx.update(documents)
      .set({
        title: command.title,
        draftContent: command.content,
        draftRevision: sql`${documents.draftRevision} + 1`,
        updatedAt,
      })
      .where(and(
        eq(documents.id, command.documentId),
        eq(documents.projectId, command.projectId),
        eq(documents.draftRevision, command.expectedRevision),
        isNull(documents.archivedAt),
      ))
      .returning({ draftRevision: documents.draftRevision })

    if (!updated) {
      const [existing] = await tx.select({ id: documents.id })
        .from(documents)
        .where(and(
          eq(documents.id, command.documentId),
          eq(documents.projectId, command.projectId),
          isNull(documents.archivedAt),
        ))
        .limit(1)
      return existing
        ? { ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.DRAFT_CONFLICT }
        : { ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.NOT_FOUND }
    }

    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'document.draft_updated',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: command.projectId,
      targetType: 'document',
      targetId: command.documentId,
      metadata: { draftRevision: updated.draftRevision },
    })
    return { ok: true, draftRevision: updated.draftRevision, updatedAt: updatedAt.toISOString() }
  })

export const updateDocumentDraftWith = (dependencies: UpdateDocumentDraftDependencies) =>
  async (input: UpdateDocumentDraftInput): Promise<UpdateDocumentDraftResult> => {
    const validation = validateDocumentDraftUpdate(input)
    if (!validation.ok) {
      return validation
    }
    try {
      const result = await dependencies.persist(validation.value)
      return result.ok
        ? { ok: true, value: { draftRevision: result.draftRevision, updatedAt: result.updatedAt } }
        : result
    }
    catch {
      return { ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.UPDATE_FAILED }
    }
  }

export const updateDocumentDraft = (input: UpdateDocumentDraftInput) =>
  updateDocumentDraftWith({ persist: updateDocumentDraftPersistence(getDatabase().db) })(input)
