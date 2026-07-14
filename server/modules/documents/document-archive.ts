import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { DOCUMENT_PUBLICATION_STATE, type DocumentPublicationState } from '../../../shared/documents/constants'
import type { ArchivedDocumentBatch } from '../../../shared/documents/contracts'
import { AUDIT_OUTCOME, MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel, ProjectPermission } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { user } from '../../infrastructure/database/schema/auth'
import { documentVersions, documents } from '../../infrastructure/database/schema/documents'
import {
  auditEvents,
  projectMemberships,
  projectRolePermissions,
  projects,
} from '../../infrastructure/database/schema/projects'

export const ARCHIVE_DOCUMENT_ERROR = {
  NOT_FOUND: 'NOT_FOUND',
  ARCHIVE_FAILED: 'ARCHIVE_FAILED',
  RESTORE_FAILED: 'RESTORE_FAILED',
} as const

export type ArchiveDocumentErrorCode = typeof ARCHIVE_DOCUMENT_ERROR[keyof typeof ARCHIVE_DOCUMENT_ERROR]

export const DISCARD_DOCUMENT_ERROR = {
  NOT_FOUND: 'NOT_FOUND',
  NOT_DISCARDABLE: 'NOT_DISCARDABLE',
  DISCARD_FAILED: 'DISCARD_FAILED',
} as const

export type DiscardDocumentErrorCode = typeof DISCARD_DOCUMENT_ERROR[keyof typeof DISCARD_DOCUMENT_ERROR]

interface DocumentPlacement {
  readonly id: string
  readonly parentId: string | null
  readonly position: number
}

interface DiscardCandidate extends DocumentPlacement {
  readonly publicationState: DocumentPublicationState
}

interface DocumentArchivePlan {
  readonly archivedIds: readonly string[]
  readonly rootParentId: string | null
  readonly rootPosition: number
  readonly siblingPlacements: readonly DocumentPlacement[]
}

type DocumentArchivePlanResult =
  | { readonly ok: true, readonly value: DocumentArchivePlan }
  | { readonly ok: false, readonly code: typeof ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }

type DocumentRestorePlanResult =
  | { readonly ok: true, readonly value: readonly DocumentPlacement[] }
  | { readonly ok: false, readonly code: typeof ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }

interface DocumentArchiveBaseInput {
  readonly actorUserId: string
  readonly projectId: string
  readonly documentId: string
  readonly channel: AuditChannel
}

export type ArchiveDocumentInput = DocumentArchiveBaseInput
export type RestoreDocumentInput = DocumentArchiveBaseInput
export type DiscardDocumentInput = DocumentArchiveBaseInput

type ArchivePersistenceResult =
  | { readonly ok: true, readonly archiveBatchId: string, readonly archivedCount: number, readonly archivedAt: string }
  | { readonly ok: false, readonly code: typeof ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }

type RestorePersistenceResult =
  | { readonly ok: true, readonly restoredCount: number, readonly restoredAt: string }
  | { readonly ok: false, readonly code: typeof ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }

type DiscardPersistenceResult =
  | { readonly ok: true, readonly deletedCount: number, readonly deletedAt: string }
  | { readonly ok: false, readonly code: typeof DISCARD_DOCUMENT_ERROR.NOT_FOUND | typeof DISCARD_DOCUMENT_ERROR.NOT_DISCARDABLE }

export type ArchiveDocumentResult =
  | { readonly ok: true, readonly value: { readonly archiveBatchId: string, readonly archivedCount: number, readonly archivedAt: string } }
  | { readonly ok: false, readonly code: ArchiveDocumentErrorCode }

export type RestoreDocumentResult =
  | { readonly ok: true, readonly value: { readonly restoredCount: number, readonly restoredAt: string } }
  | { readonly ok: false, readonly code: ArchiveDocumentErrorCode }

export type DiscardDocumentResult =
  | { readonly ok: true, readonly value: { readonly deletedCount: number, readonly deletedAt: string } }
  | { readonly ok: false, readonly code: DiscardDocumentErrorCode }

export interface ArchiveDocumentDependencies {
  readonly archive: (command: ArchiveDocumentInput) => Promise<ArchivePersistenceResult>
}

export interface RestoreDocumentDependencies {
  readonly restore: (command: RestoreDocumentInput) => Promise<RestorePersistenceResult>
}

export interface DiscardDocumentDependencies {
  readonly discard: (command: DiscardDocumentInput) => Promise<DiscardPersistenceResult>
}

type DocumentsDatabase = ReturnType<typeof getDatabase>['db']
type DocumentsQuery = Pick<DocumentsDatabase, 'select'>

const comparePlacements = (left: DocumentPlacement, right: DocumentPlacement): number =>
  left.position - right.position || left.id.localeCompare(right.id)

export const planDocumentArchive = (
  rows: readonly DocumentPlacement[],
  documentId: string,
): DocumentArchivePlanResult => {
  const root = rows.find(row => row.id === documentId)
  if (!root) {
    return { ok: false, code: ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }
  }
  const childrenByParent = new Map<string, DocumentPlacement[]>()
  for (const row of rows) {
    if (row.parentId === null) continue
    const children = childrenByParent.get(row.parentId) ?? []
    childrenByParent.set(row.parentId, [...children, row])
  }
  const archivedIds: string[] = []
  const visited = new Set<string>()
  const collect = (row: DocumentPlacement): void => {
    if (visited.has(row.id)) return
    visited.add(row.id)
    archivedIds.push(row.id)
    for (const child of (childrenByParent.get(row.id) ?? []).toSorted(comparePlacements)) {
      collect(child)
    }
  }
  collect(root)

  const siblingPlacements = rows
    .filter(row => row.parentId === root.parentId && row.id !== root.id)
    .toSorted(comparePlacements)
    .map((row, position): DocumentPlacement => ({ id: row.id, parentId: row.parentId, position }))
  return {
    ok: true,
    value: {
      archivedIds,
      rootParentId: root.parentId,
      rootPosition: root.position,
      siblingPlacements,
    },
  }
}

export const planDocumentRestore = (
  activeRows: readonly DocumentPlacement[],
  root: DocumentPlacement,
): DocumentRestorePlanResult => {
  if (root.parentId !== null && !activeRows.some(row => row.id === root.parentId)) {
    return { ok: false, code: ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }
  }
  const siblings = activeRows
    .filter(row => row.parentId === root.parentId && row.id !== root.id)
    .toSorted(comparePlacements)
  const targetPosition = Math.min(root.position, siblings.length)
  return {
    ok: true,
    value: siblings.toSpliced(targetPosition, 0, root)
      .map((row, position): DocumentPlacement => ({ id: row.id, parentId: row.parentId, position })),
  }
}

export const planDocumentDiscard = (
  rows: readonly DiscardCandidate[],
  documentId: string,
  versionedDocumentIds: ReadonlySet<string>,
) => {
  const branchPlan = planDocumentArchive(rows, documentId)
  if (!branchPlan.ok) {
    return { ok: false, code: DISCARD_DOCUMENT_ERROR.NOT_FOUND } as const
  }
  const rowsById = new Map(rows.map(row => [row.id, row]))
  const protectedHistory = branchPlan.value.archivedIds.some((id) => {
    const row = rowsById.get(id)
    return row?.publicationState !== DOCUMENT_PUBLICATION_STATE.DRAFT || versionedDocumentIds.has(id)
  })
  if (protectedHistory) {
    return { ok: false, code: DISCARD_DOCUMENT_ERROR.NOT_DISCARDABLE } as const
  }
  return {
    ok: true,
    value: {
      deletedIds: branchPlan.value.archivedIds,
      rootParentId: branchPlan.value.rootParentId,
      rootPosition: branchPlan.value.rootPosition,
      siblingPlacements: branchPlan.value.siblingPlacements,
    },
  } as const
}

const hasPermission = async (
  db: DocumentsQuery,
  projectId: string,
  actorUserId: string,
  permission: ProjectPermission,
): Promise<boolean> => {
  const [access] = await db.select({ membershipId: projectMemberships.id })
    .from(projectMemberships)
    .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(projectMemberships.userId, actorUserId),
      eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
      eq(projectRolePermissions.permissionCode, permission),
    ))
    .limit(1)
  return access !== undefined
}

export const archiveDocumentPersistence = (db: DocumentsDatabase): ArchiveDocumentDependencies['archive'] =>
  command => db.transaction(async (tx): Promise<ArchivePersistenceResult> => {
    const [project] = await tx.select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, command.projectId), isNull(projects.archivedAt)))
      .for('update')
    if (!project || !await hasPermission(tx, command.projectId, command.actorUserId, PROJECT_PERMISSION.DOCUMENTS_ARCHIVE)) {
      return { ok: false, code: ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }
    }
    const rows = await tx.select({ id: documents.id, parentId: documents.parentId, position: documents.position })
      .from(documents)
      .where(and(eq(documents.projectId, command.projectId), isNull(documents.archivedAt)))
      .for('update')
    const plan = planDocumentArchive(rows, command.documentId)
    if (!plan.ok) return plan

    const archivedAt = new Date()
    await tx.update(documents).set({
      archiveBatchId: command.documentId,
      archivedAt,
      archivedByUserId: command.actorUserId,
    }).where(and(
      eq(documents.projectId, command.projectId),
      inArray(documents.id, plan.value.archivedIds),
      isNull(documents.archivedAt),
    ))
    for (const placement of plan.value.siblingPlacements) {
      await tx.update(documents).set({ position: placement.position }).where(and(
        eq(documents.id, placement.id),
        eq(documents.projectId, command.projectId),
        isNull(documents.archivedAt),
      ))
    }
    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'document.archived',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: command.projectId,
      targetType: 'document',
      targetId: command.documentId,
      metadata: {
        archiveBatchId: command.documentId,
        archivedCount: plan.value.archivedIds.length,
        parentId: plan.value.rootParentId,
        position: plan.value.rootPosition,
      },
    })
    return {
      ok: true,
      archiveBatchId: command.documentId,
      archivedCount: plan.value.archivedIds.length,
      archivedAt: archivedAt.toISOString(),
    }
  })

export const restoreDocumentPersistence = (db: DocumentsDatabase): RestoreDocumentDependencies['restore'] =>
  command => db.transaction(async (tx): Promise<RestorePersistenceResult> => {
    const [project] = await tx.select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, command.projectId), isNull(projects.archivedAt)))
      .for('update')
    if (!project || !await hasPermission(tx, command.projectId, command.actorUserId, PROJECT_PERMISSION.DOCUMENTS_RESTORE)) {
      return { ok: false, code: ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }
    }
    const batch = await tx.select({ id: documents.id, parentId: documents.parentId, position: documents.position })
      .from(documents)
      .where(and(
        eq(documents.projectId, command.projectId),
        eq(documents.archiveBatchId, command.documentId),
        isNotNull(documents.archivedAt),
      ))
      .for('update')
    const root = batch.find(row => row.id === command.documentId)
    if (!root || batch.length === 0) {
      return { ok: false, code: ARCHIVE_DOCUMENT_ERROR.NOT_FOUND }
    }
    const activeRows = await tx.select({ id: documents.id, parentId: documents.parentId, position: documents.position })
      .from(documents)
      .where(and(eq(documents.projectId, command.projectId), isNull(documents.archivedAt)))
      .for('update')
    const placementPlan = planDocumentRestore(activeRows, root)
    if (!placementPlan.ok) return placementPlan

    for (const placement of placementPlan.value) {
      await tx.update(documents).set({ position: placement.position }).where(and(
        eq(documents.id, placement.id),
        eq(documents.projectId, command.projectId),
      ))
    }
    await tx.update(documents).set({
      archiveBatchId: null,
      archivedAt: null,
      archivedByUserId: null,
    }).where(and(
      eq(documents.projectId, command.projectId),
      eq(documents.archiveBatchId, command.documentId),
      isNotNull(documents.archivedAt),
    ))
    const restoredAt = new Date()
    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'document.restored',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: command.projectId,
      targetType: 'document',
      targetId: command.documentId,
      metadata: { archiveBatchId: command.documentId, restoredCount: batch.length, parentId: root.parentId },
    })
    return { ok: true, restoredCount: batch.length, restoredAt: restoredAt.toISOString() }
  })

export const discardDocumentPersistence = (db: DocumentsDatabase): DiscardDocumentDependencies['discard'] =>
  command => db.transaction(async (tx): Promise<DiscardPersistenceResult> => {
    const [project] = await tx.select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, command.projectId), isNull(projects.archivedAt)))
      .for('update')
    if (!project || !await hasPermission(tx, command.projectId, command.actorUserId, PROJECT_PERMISSION.DOCUMENTS_ARCHIVE)) {
      return { ok: false, code: DISCARD_DOCUMENT_ERROR.NOT_FOUND }
    }
    const rows = await tx.select({
      id: documents.id,
      parentId: documents.parentId,
      position: documents.position,
      publicationState: documents.publicationState,
    })
      .from(documents)
      .where(and(eq(documents.projectId, command.projectId), isNull(documents.archivedAt)))
      .for('update')
    const versionRows = await tx.selectDistinct({ documentId: documentVersions.documentId })
      .from(documentVersions)
      .where(eq(documentVersions.projectId, command.projectId))
    const plan = planDocumentDiscard(rows, command.documentId, new Set(versionRows.map(row => row.documentId)))
    if (!plan.ok) return plan

    const deletedAt = new Date()
    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'document.discarded',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: command.projectId,
      targetType: 'document',
      targetId: command.documentId,
      metadata: {
        deletedCount: plan.value.deletedIds.length,
        parentId: plan.value.rootParentId,
        position: plan.value.rootPosition,
      },
    })
    await tx.delete(documents).where(and(
      eq(documents.id, command.documentId),
      eq(documents.projectId, command.projectId),
      isNull(documents.archivedAt),
    ))
    for (const placement of plan.value.siblingPlacements) {
      await tx.update(documents).set({ position: placement.position }).where(and(
        eq(documents.id, placement.id),
        eq(documents.projectId, command.projectId),
        isNull(documents.archivedAt),
      ))
    }
    return { ok: true, deletedCount: plan.value.deletedIds.length, deletedAt: deletedAt.toISOString() }
  })

export const archiveDocumentWith = (dependencies: ArchiveDocumentDependencies) =>
  async (input: ArchiveDocumentInput): Promise<ArchiveDocumentResult> => {
    try {
      const result = await dependencies.archive(input)
      return result.ok
        ? { ok: true, value: { archiveBatchId: result.archiveBatchId, archivedCount: result.archivedCount, archivedAt: result.archivedAt } }
        : result
    }
    catch {
      return { ok: false, code: ARCHIVE_DOCUMENT_ERROR.ARCHIVE_FAILED }
    }
  }

export const restoreDocumentWith = (dependencies: RestoreDocumentDependencies) =>
  async (input: RestoreDocumentInput): Promise<RestoreDocumentResult> => {
    try {
      const result = await dependencies.restore(input)
      return result.ok
        ? { ok: true, value: { restoredCount: result.restoredCount, restoredAt: result.restoredAt } }
        : result
    }
    catch {
      return { ok: false, code: ARCHIVE_DOCUMENT_ERROR.RESTORE_FAILED }
    }
  }

export const discardDocumentWith = (dependencies: DiscardDocumentDependencies) =>
  async (input: DiscardDocumentInput): Promise<DiscardDocumentResult> => {
    try {
      const result = await dependencies.discard(input)
      return result.ok
        ? { ok: true, value: { deletedCount: result.deletedCount, deletedAt: result.deletedAt } }
        : result
    }
    catch {
      return { ok: false, code: DISCARD_DOCUMENT_ERROR.DISCARD_FAILED }
    }
  }

export const listArchivedDocumentBatchesForUser = async (
  db: DocumentsDatabase,
  projectId: string,
  actorUserId: string,
): Promise<readonly ArchivedDocumentBatch[] | null> => {
  if (!await hasPermission(db, projectId, actorUserId, PROJECT_PERMISSION.DOCUMENTS_VIEW)) return null
  const rows = await db.select({
    id: documents.id,
    title: documents.title,
    parentId: documents.parentId,
    archiveBatchId: documents.archiveBatchId,
    archivedAt: documents.archivedAt,
    archivedByName: user.name,
  })
    .from(documents)
    .leftJoin(user, eq(documents.archivedByUserId, user.id))
    .where(and(eq(documents.projectId, projectId), isNotNull(documents.archivedAt), isNotNull(documents.archiveBatchId)))
    .orderBy(desc(documents.archivedAt))
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.archiveBatchId !== null) counts.set(row.archiveBatchId, (counts.get(row.archiveBatchId) ?? 0) + 1)
  }
  return rows.flatMap((row): readonly ArchivedDocumentBatch[] =>
    row.archiveBatchId === row.id && row.archivedAt !== null
      ? [{
          id: row.id,
          title: row.title,
          originalParentId: row.parentId,
          pageCount: counts.get(row.id) ?? 1,
          archivedAt: row.archivedAt.toISOString(),
          archivedByName: row.archivedByName ?? 'Неизвестный пользователь',
        }]
      : [])
}

export const archiveDocument = (input: ArchiveDocumentInput) =>
  archiveDocumentWith({ archive: archiveDocumentPersistence(getDatabase().db) })(input)
export const restoreDocument = (input: RestoreDocumentInput) =>
  restoreDocumentWith({ restore: restoreDocumentPersistence(getDatabase().db) })(input)
export const discardDocument = (input: DiscardDocumentInput) =>
  discardDocumentWith({ discard: discardDocumentPersistence(getDatabase().db) })(input)
export const listArchivedDocumentBatches = (projectId: string, actorUserId: string) =>
  listArchivedDocumentBatchesForUser(getDatabase().db, projectId, actorUserId)
