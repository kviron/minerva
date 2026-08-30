import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { DOCUMENT_DRAFT_UPDATE_CODE, DOCUMENT_PUBLICATION_STATE } from '../../../shared/documents/constants'
import type { DocumentContent } from '../../../shared/documents/contracts'
import { AUDIT_OUTCOME, MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { documents } from '../../infrastructure/database/schema/documents'
import { documentImages } from '../../infrastructure/database/schema/files'
import { auditEvents, projectMemberships, projectRolePermissions, projects } from '../../infrastructure/database/schema/projects'
import {
  withDocumentMutationAuditAttribution,
  type DocumentMutationAuditAttribution,
} from '../projects/audit-attribution'
import { extractInternalDocumentLinkTargetIds, extractReferencedImageIds, parseDocumentContent } from './content-schema'
import type { DocumentMutationTransaction } from './create-document'
import { extractDocumentSearchText } from './search-documents'

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
  readonly auditAttribution?: DocumentMutationAuditAttribution
}

export interface ValidDocumentDraftUpdate extends Omit<UpdateDocumentDraftInput, 'content'> {
  readonly content: DocumentContent
  readonly searchText: string
  readonly internalLinkTargetIds: readonly string[]
  readonly referencedImageIds: readonly string[]
}

type ValidationResult =
  | { readonly ok: true, readonly value: ValidDocumentDraftUpdate }
  | { readonly ok: false, readonly code: typeof UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT }

type PersistenceResult =
  | { readonly ok: true, readonly draftRevision: number, readonly updatedAt: string }
  | { readonly ok: false, readonly code: typeof UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT | typeof UPDATE_DOCUMENT_DRAFT_ERROR.NOT_FOUND | typeof UPDATE_DOCUMENT_DRAFT_ERROR.DRAFT_CONFLICT }

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
  return {
    ok: true,
    value: {
      ...input,
      title,
      content,
      searchText: extractDocumentSearchText(content),
      internalLinkTargetIds: extractInternalDocumentLinkTargetIds(content),
      referencedImageIds: extractReferencedImageIds(content),
    },
  }
}

export const updateDocumentDraftInTransaction = async (
  tx: DocumentMutationTransaction,
  command: ValidDocumentDraftUpdate,
): Promise<PersistenceResult> => {
    const [project] = await tx.select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, command.projectId), isNull(projects.archivedAt)))
      .for('update')
    if (!project) {
      return { ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.NOT_FOUND }
    }

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

    if (command.referencedImageIds.length > 0) {
      const imageRows = await tx.select({ id: documentImages.id }).from(documentImages).where(and(
        eq(documentImages.projectId, command.projectId),
        isNull(documentImages.archivedAt),
        inArray(documentImages.id, command.referencedImageIds),
      ))
      if (imageRows.length !== command.referencedImageIds.length) {
        return { ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT }
      }
    }

    const updatedAt = new Date()
    const [updated] = await tx.update(documents)
      .set({
        title: command.title,
        draftContent: command.content,
        draftSearchText: command.searchText,
        draftInternalLinkTargetIds: [...command.internalLinkTargetIds],
        draftReferencedImageIds: [...command.referencedImageIds],
        draftRevision: sql`${documents.draftRevision} + 1`,
        publicationState: DOCUMENT_PUBLICATION_STATE.DRAFT,
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
      metadata: withDocumentMutationAuditAttribution(
        { draftRevision: updated.draftRevision },
        command.auditAttribution,
        { documentId: command.documentId, draftRevision: updated.draftRevision },
      ),
    })
    return { ok: true, draftRevision: updated.draftRevision, updatedAt: updatedAt.toISOString() }
}

export const updateDocumentDraftPersistence = (db: DocumentsDatabase): UpdateDocumentDraftDependencies['persist'] =>
  command => db.transaction(tx => updateDocumentDraftInTransaction(tx, command))

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
