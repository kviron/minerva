import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  AI_DOCUMENT_PROPOSAL_KIND,
  AI_DOCUMENT_PROPOSAL_STATUS,
} from '../../../shared/ai-assistant/constants'
import { createProjectAiDocumentProposalRepository } from '../../../server/modules/ai-assistant/document-proposal-repository'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const ownerId = '00000000-0000-4000-8000-0000000003a1'
const otherUserId = '00000000-0000-4000-8000-0000000003a2'
const projectId = '00000000-0000-4000-8000-0000000003a3'
const conversationId = '00000000-0000-4000-8000-0000000003a4'
const proposalId = '00000000-0000-4000-8000-0000000003a5'
const turnRequestId = '00000000-0000-4000-8000-0000000003a6'
const now = new Date('2026-07-31T12:00:00.000Z')
const content = { type: 'doc' as const, content: [{ type: 'paragraph' }] }

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
        (${ownerId}, 'Owner', 'proposal-owner@example.com', true, 'active'),
        (${otherUserId}, 'Other', 'proposal-other@example.com', true, 'active')
    `
    await database.queryClient`
      insert into projects (id, name, status, created_by_user_id)
      values (${projectId}, 'Proposals', 'active', ${ownerId})
    `
    await database.queryClient`
      insert into project_ai_conversations
        (id, project_id, user_id, title, expires_at, created_at, updated_at)
      values
        (
          ${conversationId},
          ${projectId},
          ${ownerId},
          'Proposal',
          ${'2026-08-30T12:00:00.000Z'},
          ${now.toISOString()},
          ${now.toISOString()}
        )
    `
  }
  finally {
    await database.close()
  }
})

describe('AI document proposal persistence', () => {
  it('isolates owners, deduplicates a turn, clears terminal payload, and cleans receipts', async () => {
    const database = createTestDatabase()
    const repository = createProjectAiDocumentProposalRepository(database.db)
    try {
      const command = {
        id: proposalId,
        projectId,
        userId: ownerId,
        conversationId,
        turnRequestId,
        kind: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
        targetDocumentId: null,
        requestedParentId: null,
        expectedDraftRevision: null,
        baseTitle: null,
        baseContent: null,
        proposedTitle: 'Новая',
        proposedContent: content,
        contentHash: 'a'.repeat(64),
        expiresAt: new Date('2026-07-31T12:15:00.000Z'),
        now,
      } as const
      expect((await repository.create(command))?.id).toBe(proposalId)
      expect((await repository.create({ ...command, id: '00000000-0000-4000-8000-0000000003a7' }))?.id)
        .toBe(proposalId)
      await expect(repository.loadOwned({
        projectId,
        userId: otherUserId,
        proposalId,
      })).resolves.toBeNull()

      const expiringId = '00000000-0000-4000-8000-0000000003a8'
      await repository.create({
        ...command,
        id: expiringId,
        turnRequestId: '00000000-0000-4000-8000-0000000003a9',
        expiresAt: new Date('2026-07-31T12:05:00.000Z'),
      })
      const cleanupNow = new Date('2026-07-31T12:05:00.000Z')
      const expiredCounts = await Promise.all([
        repository.expirePending({ now: cleanupNow, limit: 10 }),
        repository.expirePending({ now: cleanupNow, limit: 10 }),
      ])
      expect(expiredCounts.reduce((total, count) => total + count, 0)).toBe(1)
      await expect(repository.loadOwned({
        projectId,
        userId: ownerId,
        proposalId: expiringId,
      })).resolves.toMatchObject({
        status: AI_DOCUMENT_PROPOSAL_STATUS.EXPIRED,
        proposedTitle: null,
        proposedContent: null,
        contentHash: null,
      })

      const rejected = await repository.terminalizeOwned({
        projectId,
        userId: ownerId,
        proposalId,
        status: AI_DOCUMENT_PROPOSAL_STATUS.REJECTED,
        decidedAt: now,
        purgeAfter: new Date('2026-08-01T12:00:00.000Z'),
        appliedDocumentId: null,
        appliedDraftRevision: null,
        clearPayload: true,
      })
      expect(rejected).toMatchObject({
        status: AI_DOCUMENT_PROPOSAL_STATUS.REJECTED,
        proposedTitle: null,
        proposedContent: null,
        contentHash: null,
      })
      await expect(repository.purgeReceipts({
        now: new Date('2026-08-01T12:00:00.000Z'),
        limit: 10,
      })).resolves.toBe(1)
    }
    finally {
      await database.close()
    }
  })
})
