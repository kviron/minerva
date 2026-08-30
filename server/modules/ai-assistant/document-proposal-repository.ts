import {
  and,
  eq,
  gt,
  isNull,
  sql,
} from 'drizzle-orm'
import {
  AI_DOCUMENT_PROPOSAL_STATUS,
} from '../../../shared/ai-assistant/constants'
import type { getDatabase } from '../../infrastructure/database/client'
import {
  projectAiConversations,
  projectAiDocumentProposals,
} from '../../infrastructure/database/schema/ai-assistant'
import type {
  ProjectAiDocumentProposalRepository,
  StoredProjectAiDocumentProposal,
} from './document-proposals'

type Database = ReturnType<typeof getDatabase>['db']

export const createProjectAiDocumentProposalRepository = (
  db: Database,
): ProjectAiDocumentProposalRepository => ({
  async create(command) {
    return db.transaction(async (tx): Promise<StoredProjectAiDocumentProposal | null> => {
      const [conversation] = await tx.select({ id: projectAiConversations.id })
        .from(projectAiConversations)
        .where(and(
          eq(projectAiConversations.id, command.conversationId),
          eq(projectAiConversations.projectId, command.projectId),
          eq(projectAiConversations.userId, command.userId),
          isNull(projectAiConversations.deletedAt),
          gt(projectAiConversations.expiresAt, command.now),
        ))
        .limit(1)
      if (!conversation) return null

      const [created] = await tx.insert(projectAiDocumentProposals).values({
        id: command.id,
        projectId: command.projectId,
        userId: command.userId,
        conversationId: command.conversationId,
        turnRequestId: command.turnRequestId,
        kind: command.kind,
        targetDocumentId: command.targetDocumentId,
        requestedParentId: command.requestedParentId,
        expectedDraftRevision: command.expectedDraftRevision,
        baseTitle: command.baseTitle,
        baseContent: command.baseContent,
        proposedTitle: command.proposedTitle,
        proposedContent: command.proposedContent,
        contentHash: command.contentHash,
        expiresAt: command.expiresAt,
        createdAt: command.now,
        updatedAt: command.now,
      }).onConflictDoNothing().returning()
      if (created) return created

      const [existing] = await tx.select().from(projectAiDocumentProposals).where(and(
        eq(projectAiDocumentProposals.projectId, command.projectId),
        eq(projectAiDocumentProposals.userId, command.userId),
        eq(projectAiDocumentProposals.conversationId, command.conversationId),
        eq(projectAiDocumentProposals.turnRequestId, command.turnRequestId),
      )).limit(1)
      return existing ?? null
    })
  },

  async loadOwned(query) {
    const [record] = await db.select().from(projectAiDocumentProposals).where(and(
      eq(projectAiDocumentProposals.id, query.proposalId),
      eq(projectAiDocumentProposals.projectId, query.projectId),
      eq(projectAiDocumentProposals.userId, query.userId),
    )).limit(1)
    return record ?? null
  },

  async terminalizeOwned(command) {
    const [record] = await db.update(projectAiDocumentProposals).set({
      status: command.status,
      targetDocumentId: null,
      requestedParentId: null,
      expectedDraftRevision: null,
      baseTitle: null,
      baseContent: null,
      proposedTitle: null,
      proposedContent: null,
      contentHash: null,
      appliedDocumentId: command.appliedDocumentId,
      appliedDraftRevision: command.appliedDraftRevision,
      decidedAt: command.decidedAt,
      purgeAfter: command.purgeAfter,
      updatedAt: command.decidedAt,
    }).where(and(
      eq(projectAiDocumentProposals.id, command.proposalId),
      eq(projectAiDocumentProposals.projectId, command.projectId),
      eq(projectAiDocumentProposals.userId, command.userId),
      eq(projectAiDocumentProposals.status, AI_DOCUMENT_PROPOSAL_STATUS.PENDING),
    )).returning()
    return record ?? null
  },

  async expirePending(command) {
    const purgeAfter = new Date(command.now.getTime() + 24 * 60 * 60 * 1_000)
    const nowIso = command.now.toISOString()
    const purgeAfterIso = purgeAfter.toISOString()
    const rows = await db.execute<{ id: string }>(sql`
      with candidates as (
        select id
        from project_ai_document_proposals
        where status = ${AI_DOCUMENT_PROPOSAL_STATUS.PENDING}
          and expires_at <= ${nowIso}::timestamptz
        order by expires_at, id
        for update skip locked
        limit ${command.limit}
      )
      update project_ai_document_proposals as proposal
      set status = ${AI_DOCUMENT_PROPOSAL_STATUS.EXPIRED},
          target_document_id = null,
          requested_parent_id = null,
          expected_draft_revision = null,
          base_title = null,
          base_content = null,
          proposed_title = null,
          proposed_content = null,
          content_hash = null,
          applied_document_id = null,
          applied_draft_revision = null,
          decided_at = ${nowIso}::timestamptz,
          purge_after = ${purgeAfterIso}::timestamptz,
          updated_at = ${nowIso}::timestamptz
      from candidates
      where proposal.id = candidates.id
        and proposal.status = ${AI_DOCUMENT_PROPOSAL_STATUS.PENDING}
        and proposal.expires_at <= ${nowIso}::timestamptz
      returning proposal.id
    `)
    return rows.length
  },

  async purgeReceipts(command) {
    const nowIso = command.now.toISOString()
    const rows = await db.execute<{ id: string }>(sql`
      with candidates as (
        select id
        from project_ai_document_proposals
        where status <> ${AI_DOCUMENT_PROPOSAL_STATUS.PENDING}
          and purge_after <= ${nowIso}::timestamptz
        order by purge_after, id
        for update skip locked
        limit ${command.limit}
      )
      delete from project_ai_document_proposals as proposal
      using candidates
      where proposal.id = candidates.id
        and proposal.status <> ${AI_DOCUMENT_PROPOSAL_STATUS.PENDING}
        and proposal.purge_after <= ${nowIso}::timestamptz
      returning proposal.id
    `)
    return rows.length
  },
})
