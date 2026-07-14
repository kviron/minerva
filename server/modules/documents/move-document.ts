import { and, eq, isNull } from 'drizzle-orm'
import { AUDIT_OUTCOME, MEMBERSHIP_STATUS, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import { getDatabase } from '../../infrastructure/database/client'
import { documents } from '../../infrastructure/database/schema/documents'
import {
  auditEvents,
  projectMemberships,
  projectRolePermissions,
  projects,
} from '../../infrastructure/database/schema/projects'

export const MOVE_DOCUMENT_ERROR = {
  INVALID_MOVE: 'INVALID_MOVE',
  NOT_FOUND: 'NOT_FOUND',
  MOVE_FAILED: 'MOVE_FAILED',
} as const

export type MoveDocumentErrorCode = typeof MOVE_DOCUMENT_ERROR[keyof typeof MOVE_DOCUMENT_ERROR]

export interface MoveDocumentInput {
  readonly actorUserId: string
  readonly projectId: string
  readonly documentId: string
  readonly channel: AuditChannel
  readonly targetParentId: string | null
  readonly targetPosition: number
}

export interface DocumentPlacement {
  readonly id: string
  readonly parentId: string | null
  readonly position: number
}

type MoveDocumentValidationResult =
  | { readonly ok: true, readonly value: MoveDocumentInput }
  | { readonly ok: false, readonly code: typeof MOVE_DOCUMENT_ERROR.INVALID_MOVE }

type DocumentMovePlanResult =
  | { readonly ok: true, readonly value: readonly DocumentPlacement[] }
  | { readonly ok: false, readonly code: typeof MOVE_DOCUMENT_ERROR.INVALID_MOVE | typeof MOVE_DOCUMENT_ERROR.NOT_FOUND }

type MoveDocumentPersistenceResult =
  | {
    readonly ok: true
    readonly parentId: string | null
    readonly position: number
    readonly updatedAt: string
  }
  | { readonly ok: false, readonly code: typeof MOVE_DOCUMENT_ERROR.INVALID_MOVE | typeof MOVE_DOCUMENT_ERROR.NOT_FOUND }

export type MoveDocumentResult =
  | {
    readonly ok: true
    readonly value: {
      readonly parentId: string | null
      readonly position: number
      readonly updatedAt: string
    }
  }
  | { readonly ok: false, readonly code: MoveDocumentErrorCode }

export interface MoveDocumentDependencies {
  readonly persist: (command: MoveDocumentInput) => Promise<MoveDocumentPersistenceResult>
}

type DocumentsDatabase = ReturnType<typeof getDatabase>['db']

const comparePlacements = (left: DocumentPlacement, right: DocumentPlacement): number =>
  left.position - right.position || left.id.localeCompare(right.id)

export const validateMoveDocument = (input: MoveDocumentInput): MoveDocumentValidationResult =>
  Number.isInteger(input.targetPosition) && input.targetPosition >= 0
    ? { ok: true, value: input }
    : { ok: false, code: MOVE_DOCUMENT_ERROR.INVALID_MOVE }

export const planDocumentMove = (
  rows: readonly DocumentPlacement[],
  documentId: string,
  targetParentId: string | null,
  targetPosition: number,
): DocumentMovePlanResult => {
  const source = rows.find(row => row.id === documentId)
  if (!source) {
    return { ok: false, code: MOVE_DOCUMENT_ERROR.NOT_FOUND }
  }

  const rowById = new Map(rows.map(row => [row.id, row]))
  if (targetParentId !== null && !rowById.has(targetParentId)) {
    return { ok: false, code: MOVE_DOCUMENT_ERROR.NOT_FOUND }
  }

  const visited = new Set<string>()
  let ancestorId = targetParentId
  while (ancestorId !== null) {
    if (ancestorId === documentId || visited.has(ancestorId)) {
      return { ok: false, code: MOVE_DOCUMENT_ERROR.INVALID_MOVE }
    }
    visited.add(ancestorId)
    const ancestor = rowById.get(ancestorId)
    if (!ancestor) {
      return { ok: false, code: MOVE_DOCUMENT_ERROR.NOT_FOUND }
    }
    ancestorId = ancestor.parentId
  }

  const remainingSourceSiblings = rows
    .filter(row => row.parentId === source.parentId && row.id !== source.id)
    .toSorted(comparePlacements)
  const targetSiblings = source.parentId === targetParentId
    ? remainingSourceSiblings
    : rows.filter(row => row.parentId === targetParentId && row.id !== source.id).toSorted(comparePlacements)

  if (targetPosition > targetSiblings.length) {
    return { ok: false, code: MOVE_DOCUMENT_ERROR.INVALID_MOVE }
  }

  const reorderedTarget = targetSiblings.toSpliced(targetPosition, 0, {
    id: source.id,
    parentId: targetParentId,
    position: targetPosition,
  }).map((row, position): DocumentPlacement => ({ id: row.id, parentId: targetParentId, position }))

  if (source.parentId === targetParentId) {
    return { ok: true, value: reorderedTarget }
  }

  const compactedSource = remainingSourceSiblings
    .map((row, position): DocumentPlacement => ({ id: row.id, parentId: source.parentId, position }))
  return { ok: true, value: [...compactedSource, ...reorderedTarget] }
}

export const moveDocumentPersistence = (db: DocumentsDatabase): MoveDocumentDependencies['persist'] =>
  command => db.transaction(async (tx): Promise<MoveDocumentPersistenceResult> => {
    const [project] = await tx.select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, command.projectId), isNull(projects.archivedAt)))
      .for('update')
    if (!project) {
      return { ok: false, code: MOVE_DOCUMENT_ERROR.NOT_FOUND }
    }

    const [access] = await tx.select({ membershipId: projectMemberships.id })
      .from(projectMemberships)
      .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
      .where(and(
        eq(projectMemberships.projectId, command.projectId),
        eq(projectMemberships.userId, command.actorUserId),
        eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
        eq(projectRolePermissions.permissionCode, PROJECT_PERMISSION.DOCUMENTS_MOVE),
      ))
      .limit(1)
    if (!access) {
      return { ok: false, code: MOVE_DOCUMENT_ERROR.NOT_FOUND }
    }

    const rows = await tx.select({
      id: documents.id,
      parentId: documents.parentId,
      position: documents.position,
    })
      .from(documents)
      .where(and(eq(documents.projectId, command.projectId), isNull(documents.archivedAt)))
      .for('update')
    const source = rows.find(row => row.id === command.documentId)
    const plan = planDocumentMove(rows, command.documentId, command.targetParentId, command.targetPosition)
    if (!source || !plan.ok) {
      return plan.ok ? { ok: false, code: MOVE_DOCUMENT_ERROR.NOT_FOUND } : plan
    }

    const updatedAt = new Date()
    for (const placement of plan.value) {
      const values = placement.id === command.documentId
        ? { parentId: placement.parentId, position: placement.position, updatedAt }
        : { parentId: placement.parentId, position: placement.position }
      await tx.update(documents)
        .set(values)
        .where(and(
          eq(documents.id, placement.id),
          eq(documents.projectId, command.projectId),
          isNull(documents.archivedAt),
        ))
    }

    await tx.insert(auditEvents).values({
      actorUserId: command.actorUserId,
      channel: command.channel,
      action: 'document.moved',
      outcome: AUDIT_OUTCOME.SUCCEEDED,
      projectId: command.projectId,
      targetType: 'document',
      targetId: command.documentId,
      metadata: {
        fromParentId: source.parentId,
        fromPosition: source.position,
        toParentId: command.targetParentId,
        toPosition: command.targetPosition,
      },
    })

    return {
      ok: true,
      parentId: command.targetParentId,
      position: command.targetPosition,
      updatedAt: updatedAt.toISOString(),
    }
  })

export const moveDocumentWith = (dependencies: MoveDocumentDependencies) =>
  async (input: MoveDocumentInput): Promise<MoveDocumentResult> => {
    const validation = validateMoveDocument(input)
    if (!validation.ok) {
      return validation
    }
    try {
      const result = await dependencies.persist(validation.value)
      return result.ok
        ? {
            ok: true,
            value: {
              parentId: result.parentId,
              position: result.position,
              updatedAt: result.updatedAt,
            },
          }
        : result
    }
    catch {
      return { ok: false, code: MOVE_DOCUMENT_ERROR.MOVE_FAILED }
    }
  }

export const moveDocument = (input: MoveDocumentInput) =>
  moveDocumentWith({ persist: moveDocumentPersistence(getDatabase().db) })(input)
