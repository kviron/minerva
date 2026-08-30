import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { ProjectAiDocumentProposalProjection } from '../../../shared/ai-assistant/contracts'
import {
  AI_DOCUMENT_PROPOSAL_KIND,
  AI_DOCUMENT_PROPOSAL_RECEIPT_HOURS,
  AI_DOCUMENT_PROPOSAL_STATUS,
} from '../../../shared/ai-assistant/constants'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import {
  AUDIT_CHANNEL,
  MEMBERSHIP_STATUS,
  PROJECT_PERMISSION,
} from '../../../shared/projects/constants'
import type { getDatabase } from '../../infrastructure/database/client'
import {
  projectAiDocumentProposals,
} from '../../infrastructure/database/schema/ai-assistant'
import { user } from '../../infrastructure/database/schema/auth'
import { documents } from '../../infrastructure/database/schema/documents'
import {
  projectMemberships,
  projectRolePermissions,
  projects,
} from '../../infrastructure/database/schema/projects'
import {
  createDocumentInTransaction,
  validateCreateDocument,
} from '../documents/create-document'
import {
  validateDocumentDraftUpdate,
  updateDocumentDraftInTransaction,
  UPDATE_DOCUMENT_DRAFT_ERROR,
} from '../documents/update-document-draft'
import type { StoredProjectAiDocumentProposal } from './document-proposals'

type Database = ReturnType<typeof getDatabase>['db']
type ProposalStatus =
  typeof AI_DOCUMENT_PROPOSAL_STATUS[keyof typeof AI_DOCUMENT_PROPOSAL_STATUS]

export const CONFIRM_DOCUMENT_PROPOSAL_ERROR = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  CONFIRM_FAILED: 'CONFIRM_FAILED',
} as const

type ConfirmationError =
  typeof CONFIRM_DOCUMENT_PROPOSAL_ERROR[keyof typeof CONFIRM_DOCUMENT_PROPOSAL_ERROR]

export type ConfirmDocumentProposalResult =
  | Readonly<{ ok: true, value: ProjectAiDocumentProposalProjection }>
  | Readonly<{ ok: false, code: ConfirmationError }>

interface ConfirmDocumentProposalInput {
  readonly projectId: string
  readonly actorUserId: string
  readonly proposalId: string
}

const projection = (
  record: StoredProjectAiDocumentProposal,
): ProjectAiDocumentProposalProjection => ({
  id: record.id,
  kind: record.kind,
  status: record.status,
  targetDocumentId: record.targetDocumentId,
  proposedTitle: record.proposedTitle,
  expiresAt: record.expiresAt.toISOString(),
  appliedDocumentId: record.appliedDocumentId,
  appliedDraftRevision: record.appliedDraftRevision,
})

const purgeAfter = (now: Date): Date =>
  new Date(now.getTime() + AI_DOCUMENT_PROPOSAL_RECEIPT_HOURS * 60 * 60 * 1_000)

const requiredMutationPermission = (
  record: StoredProjectAiDocumentProposal,
) => record.kind === AI_DOCUMENT_PROPOSAL_KIND.CREATE
  ? PROJECT_PERMISSION.DOCUMENTS_CREATE
  : PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT

export const confirmDocumentProposalPersistence = (
  db: Database,
  now: () => Date = () => new Date(),
) => async (
  input: ConfirmDocumentProposalInput,
): Promise<ConfirmDocumentProposalResult> => {
  try {
    return await db.transaction(async (tx): Promise<ConfirmDocumentProposalResult> => {
      const [record] = await tx.select().from(projectAiDocumentProposals).where(and(
        eq(projectAiDocumentProposals.id, input.proposalId),
        eq(projectAiDocumentProposals.projectId, input.projectId),
        eq(projectAiDocumentProposals.userId, input.actorUserId),
      )).for('update').limit(1)
      if (!record) {
        return { ok: false, code: CONFIRM_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND }
      }
      if (record.status === AI_DOCUMENT_PROPOSAL_STATUS.APPLIED) {
        return { ok: true, value: projection(record) }
      }
      if (record.status !== AI_DOCUMENT_PROPOSAL_STATUS.PENDING) {
        return { ok: false, code: CONFIRM_DOCUMENT_PROPOSAL_ERROR.INVALID_TRANSITION }
      }

      const currentTime = now()
      const terminalize = async (
        status: Exclude<ProposalStatus, typeof AI_DOCUMENT_PROPOSAL_STATUS.PENDING>,
        appliedDocumentId: string | null = null,
        appliedDraftRevision: number | null = null,
      ): Promise<ProjectAiDocumentProposalProjection> => {
        const [terminal] = await tx.update(projectAiDocumentProposals).set({
          status,
          targetDocumentId: null,
          requestedParentId: null,
          expectedDraftRevision: null,
          baseTitle: null,
          baseContent: null,
          proposedTitle: null,
          proposedContent: null,
          contentHash: null,
          appliedDocumentId,
          appliedDraftRevision,
          decidedAt: currentTime,
          purgeAfter: purgeAfter(currentTime),
          updatedAt: currentTime,
        }).where(and(
          eq(projectAiDocumentProposals.id, record.id),
          eq(projectAiDocumentProposals.status, AI_DOCUMENT_PROPOSAL_STATUS.PENDING),
        )).returning()
        if (!terminal) throw new Error('Proposal terminal transition returned no row')
        return projection(terminal)
      }

      if (currentTime.getTime() >= record.expiresAt.getTime()) {
        return {
          ok: true,
          value: await terminalize(AI_DOCUMENT_PROPOSAL_STATUS.EXPIRED),
        }
      }

      const permissions = await tx.select({ code: projectRolePermissions.permissionCode })
        .from(projectMemberships)
        .innerJoin(user, eq(projectMemberships.userId, user.id))
        .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
        .innerJoin(projectRolePermissions, eq(projectMemberships.roleId, projectRolePermissions.roleId))
        .where(and(
          eq(projectMemberships.projectId, input.projectId),
          eq(projectMemberships.userId, input.actorUserId),
          eq(projectMemberships.status, MEMBERSHIP_STATUS.ACTIVE),
          eq(user.status, ACCOUNT_STATUS.ACTIVE),
          isNull(projects.archivedAt),
          inArray(projectRolePermissions.permissionCode, [
            PROJECT_PERMISSION.PROJECT_AI_USE,
            requiredMutationPermission(record),
          ]),
        ))
      const permissionCodes = new Set(permissions.map(entry => entry.code))
      if (
        !permissionCodes.has(PROJECT_PERMISSION.PROJECT_AI_USE)
        || !permissionCodes.has(requiredMutationPermission(record))
      ) {
        return { ok: false, code: CONFIRM_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND }
      }

      if (record.proposedTitle === null || record.proposedContent === null) {
        throw new Error('Pending proposal has no payload')
      }

      const contentValidation = validateDocumentDraftUpdate({
        actorUserId: input.actorUserId,
        projectId: input.projectId,
        documentId: record.targetDocumentId ?? input.proposalId,
        channel: AUDIT_CHANNEL.WEB,
        title: record.proposedTitle,
        content: record.proposedContent,
        expectedRevision: record.expectedDraftRevision ?? 0,
      })
      if (!contentValidation.ok) {
        return {
          ok: true,
          value: await terminalize(AI_DOCUMENT_PROPOSAL_STATUS.STALE),
        }
      }
      if (contentValidation.value.internalLinkTargetIds.length > 0) {
        const referenceRows = await tx.select({ id: documents.id }).from(documents).where(and(
          eq(documents.projectId, input.projectId),
          isNull(documents.archivedAt),
          inArray(documents.id, contentValidation.value.internalLinkTargetIds),
        ))
        if (referenceRows.length !== contentValidation.value.internalLinkTargetIds.length) {
          return {
            ok: true,
            value: await terminalize(AI_DOCUMENT_PROPOSAL_STATUS.STALE),
          }
        }
      }

      const attribution = {
        kind: 'ai',
        value: {
          proposalId: record.id,
          conversationId: record.conversationId,
          turnRequestId: record.turnRequestId,
          operation: record.kind,
        },
      } as const

      if (record.kind === AI_DOCUMENT_PROPOSAL_KIND.CREATE) {
        const validation = validateCreateDocument({
          actorUserId: input.actorUserId,
          projectId: input.projectId,
          channel: AUDIT_CHANNEL.WEB,
          title: record.proposedTitle,
          parentId: record.requestedParentId,
          content: record.proposedContent,
          auditAttribution: attribution,
        })
        if (!validation.ok) {
          return {
            ok: true,
            value: await terminalize(AI_DOCUMENT_PROPOSAL_STATUS.STALE),
          }
        }
        const result = await createDocumentInTransaction(tx, validation.value)
        if (!result.ok) {
          return {
            ok: true,
            value: await terminalize(AI_DOCUMENT_PROPOSAL_STATUS.STALE),
          }
        }
        return {
          ok: true,
          value: await terminalize(
            AI_DOCUMENT_PROPOSAL_STATUS.APPLIED,
            result.documentId,
            0,
          ),
        }
      }

      if (
        record.targetDocumentId === null
        || record.expectedDraftRevision === null
        || record.baseTitle === null
        || record.baseContent === null
      ) {
        throw new Error('Pending update proposal has an incomplete base')
      }
      const [currentDocument] = await tx.select({ id: documents.id }).from(documents).where(and(
        eq(documents.id, record.targetDocumentId),
        eq(documents.projectId, input.projectId),
        eq(documents.title, record.baseTitle),
        eq(documents.draftRevision, record.expectedDraftRevision),
        eq(documents.draftContent, record.baseContent),
        isNull(documents.archivedAt),
      )).limit(1)
      if (!currentDocument) {
        return {
          ok: true,
          value: await terminalize(AI_DOCUMENT_PROPOSAL_STATUS.STALE),
        }
      }
      const validation = validateDocumentDraftUpdate({
        actorUserId: input.actorUserId,
        projectId: input.projectId,
        documentId: record.targetDocumentId,
        channel: AUDIT_CHANNEL.WEB,
        title: record.proposedTitle,
        content: record.proposedContent,
        expectedRevision: record.expectedDraftRevision,
        auditAttribution: attribution,
      })
      if (!validation.ok) {
        return {
          ok: true,
          value: await terminalize(AI_DOCUMENT_PROPOSAL_STATUS.STALE),
        }
      }
      const result = await updateDocumentDraftInTransaction(tx, validation.value)
      if (!result.ok) {
        if (
          result.code === UPDATE_DOCUMENT_DRAFT_ERROR.DRAFT_CONFLICT
          || result.code === UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT
          || result.code === UPDATE_DOCUMENT_DRAFT_ERROR.NOT_FOUND
        ) {
          return {
            ok: true,
            value: await terminalize(AI_DOCUMENT_PROPOSAL_STATUS.STALE),
          }
        }
      }
      if (!result.ok) throw new Error('Unexpected document update result')
      return {
        ok: true,
        value: await terminalize(
          AI_DOCUMENT_PROPOSAL_STATUS.APPLIED,
          record.targetDocumentId,
          result.draftRevision,
        ),
      }
    })
  }
  catch {
    return { ok: false, code: CONFIRM_DOCUMENT_PROPOSAL_ERROR.CONFIRM_FAILED }
  }
}
