import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  AI_DOCUMENT_PROPOSAL_KIND,
  AI_DOCUMENT_PROPOSAL_STATUS,
} from '../../../shared/ai-assistant/constants'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { AUDIT_CHANNEL, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import {
  CONFIRM_DOCUMENT_PROPOSAL_ERROR,
  confirmDocumentProposalPersistence,
} from '../../../server/modules/ai-assistant/confirm-document-proposal'
import { createProjectAiDocumentProposalRepository } from '../../../server/modules/ai-assistant/document-proposal-repository'
import {
  createDocumentPersistence,
  createDocumentWith,
} from '../../../server/modules/documents/create-document'
import {
  updateDocumentDraftPersistence,
  updateDocumentDraftWith,
} from '../../../server/modules/documents/update-document-draft'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const ownerId = '00000000-0000-4000-8000-0000000003b1'
const otherUserId = '00000000-0000-4000-8000-0000000003b2'
const conversationId = '00000000-0000-4000-8000-0000000003b3'
const now = new Date('2026-07-31T12:00:00.000Z')
const expiresAt = new Date('2026-07-31T12:15:00.000Z')
const emptyContent = { type: 'doc' as const, content: [] }
const proposedContent = {
  type: 'doc' as const,
  content: [{
    type: 'paragraph',
    content: [{ type: 'text', text: 'AI content' }],
  }],
}

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
        (${ownerId}, 'Owner', 'confirmation-owner@example.com', true, 'active'),
        (${otherUserId}, 'Other', 'confirmation-other@example.com', true, 'active')
    `
  }
  finally {
    await database.close()
  }
})

const setupProject = async (database: ReturnType<typeof createTestDatabase>) => {
  const project = await createProjectPersistence(database.db)({
    actorUserId: ownerId,
    channel: AUDIT_CHANNEL.WEB,
    name: 'Confirmation project',
    description: null,
  })
  await database.queryClient`
    insert into project_ai_conversations
      (id, project_id, user_id, title, expires_at, created_at, updated_at)
    values (
      ${conversationId},
      ${project.projectId},
      ${ownerId},
      'Confirmation',
      ${'2026-08-30T12:00:00.000Z'},
      ${now.toISOString()},
      ${now.toISOString()}
    )
  `
  return project.projectId
}

describe('AI document proposal confirmation', () => {
  it('atomically creates once, replays the receipt, and writes content-free AI audit metadata', async () => {
    const database = createTestDatabase()
    try {
      const projectId = await setupProject(database)
      const repository = createProjectAiDocumentProposalRepository(database.db)
      const proposalId = '00000000-0000-4000-8000-0000000003b4'
      await repository.create({
        id: proposalId,
        projectId,
        userId: ownerId,
        conversationId,
        turnRequestId: '00000000-0000-4000-8000-0000000003b5',
        kind: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
        targetDocumentId: null,
        requestedParentId: null,
        expectedDraftRevision: null,
        baseTitle: null,
        baseContent: null,
        proposedTitle: 'AI page',
        proposedContent,
        contentHash: 'b'.repeat(64),
        expiresAt,
        now,
      })

      const confirm = confirmDocumentProposalPersistence(
        database.db,
        () => new Date('2026-07-31T12:01:00.000Z'),
      )
      const [first, second] = await Promise.all([
        confirm({ projectId, actorUserId: ownerId, proposalId }),
        confirm({ projectId, actorUserId: ownerId, proposalId }),
      ])
      expect(first).toMatchObject({ ok: true, value: { status: AI_DOCUMENT_PROPOSAL_STATUS.APPLIED } })
      expect(second).toEqual(first)

      const rows = await database.queryClient<{
        id: string
        title: string
        content: unknown
      }[]>`
        select id, title, draft_content as content
        from documents
        where project_id = ${projectId}
      `
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ title: 'AI page', content: proposedContent })

      const receipts = await database.queryClient<{
        proposedContent: unknown
        appliedDocumentId: string
      }[]>`
        select
          proposed_content as "proposedContent",
          applied_document_id as "appliedDocumentId"
        from project_ai_document_proposals
        where id = ${proposalId}
      `
      expect(receipts).toEqual([{
        proposedContent: null,
        appliedDocumentId: rows[0]?.id,
      }])

      const audits = await database.queryClient<{ metadata: Record<string, unknown> }[]>`
        select metadata
        from audit_events
        where project_id = ${projectId} and action = 'document.created'
      `
      expect(audits).toHaveLength(1)
      expect(audits[0]?.metadata).toMatchObject({
        source: 'content',
        ai: {
          proposalId,
          operation: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
          documentId: rows[0]?.id,
          draftRevision: 0,
        },
      })
      expect(JSON.stringify(audits[0]?.metadata)).not.toContain('AI content')
    }
    finally {
      await database.close()
    }
  })

  it('updates the expected draft once and makes a changed revision stale', async () => {
    const database = createTestDatabase()
    try {
      const projectId = await setupProject(database)
      const create = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const created = await create({
        actorUserId: ownerId,
        projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Existing page',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!created.ok) throw new Error('Expected document')
      const repository = createProjectAiDocumentProposalRepository(database.db)
      const proposalId = '00000000-0000-4000-8000-0000000003b6'
      await repository.create({
        id: proposalId,
        projectId,
        userId: ownerId,
        conversationId,
        turnRequestId: '00000000-0000-4000-8000-0000000003b7',
        kind: AI_DOCUMENT_PROPOSAL_KIND.UPDATE,
        targetDocumentId: created.value.documentId,
        requestedParentId: null,
        expectedDraftRevision: 0,
        baseTitle: 'Existing page',
        baseContent: emptyContent,
        proposedTitle: 'Updated by AI',
        proposedContent,
        contentHash: 'c'.repeat(64),
        expiresAt,
        now,
      })
      const confirm = confirmDocumentProposalPersistence(
        database.db,
        () => new Date('2026-07-31T12:01:00.000Z'),
      )
      const confirmations = await Promise.all([
        confirm({ projectId, actorUserId: ownerId, proposalId }),
        confirm({ projectId, actorUserId: ownerId, proposalId }),
      ])
      expect(confirmations[0]).toMatchObject({
        ok: true,
        value: { status: AI_DOCUMENT_PROPOSAL_STATUS.APPLIED, appliedDraftRevision: 1 },
      })
      expect(confirmations[1]).toEqual(confirmations[0])

      const staleProposalId = '00000000-0000-4000-8000-0000000003b8'
      await repository.create({
        id: staleProposalId,
        projectId,
        userId: ownerId,
        conversationId,
        turnRequestId: '00000000-0000-4000-8000-0000000003b9',
        kind: AI_DOCUMENT_PROPOSAL_KIND.UPDATE,
        targetDocumentId: created.value.documentId,
        requestedParentId: null,
        expectedDraftRevision: 1,
        baseTitle: 'Updated by AI',
        baseContent: proposedContent,
        proposedTitle: 'Stale AI title',
        proposedContent: emptyContent,
        contentHash: 'd'.repeat(64),
        expiresAt,
        now,
      })
      const update = updateDocumentDraftWith({
        persist: updateDocumentDraftPersistence(database.db),
      })
      await expect(update({
        actorUserId: ownerId,
        projectId,
        documentId: created.value.documentId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'User edit',
        content: proposedContent,
        expectedRevision: 1,
      })).resolves.toMatchObject({ ok: true, value: { draftRevision: 2 } })
      await expect(confirm({
        projectId,
        actorUserId: ownerId,
        proposalId: staleProposalId,
      })).resolves.toMatchObject({
        ok: true,
        value: { status: AI_DOCUMENT_PROPOSAL_STATUS.STALE },
      })
      const documentsAfter = await database.queryClient<{ title: string, draftRevision: number }[]>`
        select title, draft_revision as "draftRevision"
        from documents
        where id = ${created.value.documentId}
      `
      expect(documentsAfter).toEqual([{ title: 'User edit', draftRevision: 2 }])
    }
    finally {
      await database.close()
    }
  })

  it('hides cross-owner records and applies no effect after create permission is removed', async () => {
    const database = createTestDatabase()
    try {
      const projectId = await setupProject(database)
      const repository = createProjectAiDocumentProposalRepository(database.db)
      const proposalId = '00000000-0000-4000-8000-0000000003ba'
      await repository.create({
        id: proposalId,
        projectId,
        userId: ownerId,
        conversationId,
        turnRequestId: '00000000-0000-4000-8000-0000000003bb',
        kind: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
        targetDocumentId: null,
        requestedParentId: null,
        expectedDraftRevision: null,
        baseTitle: null,
        baseContent: null,
        proposedTitle: 'Must not exist',
        proposedContent,
        contentHash: 'e'.repeat(64),
        expiresAt,
        now,
      })
      const confirm = confirmDocumentProposalPersistence(
        database.db,
        () => new Date('2026-07-31T12:01:00.000Z'),
      )
      const otherProject = await createProjectPersistence(database.db)({
        actorUserId: ownerId,
        channel: AUDIT_CHANNEL.WEB,
        name: 'Other project',
        description: null,
      })
      await expect(confirm({
        projectId: otherProject.projectId,
        actorUserId: ownerId,
        proposalId,
      })).resolves.toEqual({
        ok: false,
        code: CONFIRM_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND,
      })
      await expect(confirm({
        projectId,
        actorUserId: otherUserId,
        proposalId,
      })).resolves.toEqual({
        ok: false,
        code: CONFIRM_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND,
      })
      await database.queryClient`
        delete from project_role_permissions
        where permission_code = ${PROJECT_PERMISSION.DOCUMENTS_CREATE}
          and role_id = (
            select role_id
            from project_memberships
            where project_id = ${projectId} and user_id = ${ownerId}
          )
      `
      await expect(confirm({
        projectId,
        actorUserId: ownerId,
        proposalId,
      })).resolves.toEqual({
        ok: false,
        code: CONFIRM_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND,
      })
      const effects = await database.queryClient<{ count: number }[]>`
        select count(*)::int as count from documents where project_id = ${projectId}
      `
      expect(effects).toEqual([{ count: 0 }])
      await expect(repository.loadOwned({
        projectId,
        userId: ownerId,
        proposalId,
      })).resolves.toMatchObject({
        status: AI_DOCUMENT_PROPOSAL_STATUS.PENDING,
        proposedContent,
      })
    }
    finally {
      await database.close()
    }
  })

  it('terminalizes archived parents and invalid image references as stale without document effects', async () => {
    const database = createTestDatabase()
    try {
      const projectId = await setupProject(database)
      const create = createDocumentWith({ persist: createDocumentPersistence(database.db) })
      const parent = await create({
        actorUserId: ownerId,
        projectId,
        channel: AUDIT_CHANNEL.WEB,
        title: 'Parent',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      })
      if (!parent.ok) throw new Error('Expected parent')
      const repository = createProjectAiDocumentProposalRepository(database.db)
      const parentProposalId = '00000000-0000-4000-8000-0000000003bc'
      await repository.create({
        id: parentProposalId,
        projectId,
        userId: ownerId,
        conversationId,
        turnRequestId: '00000000-0000-4000-8000-0000000003bd',
        kind: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
        targetDocumentId: null,
        requestedParentId: parent.value.documentId,
        expectedDraftRevision: null,
        baseTitle: null,
        baseContent: null,
        proposedTitle: 'Child',
        proposedContent,
        contentHash: 'f'.repeat(64),
        expiresAt,
        now,
      })
      await database.queryClient`
        update documents
        set
          archived_at = ${'2026-07-31T12:00:30.000Z'},
          archived_by_user_id = ${ownerId},
          archive_batch_id = ${'00000000-0000-4000-8000-0000000003be'}
        where id = ${parent.value.documentId}
      `

      const confirm = confirmDocumentProposalPersistence(
        database.db,
        () => new Date('2026-07-31T12:01:00.000Z'),
      )
      await expect(confirm({
        projectId,
        actorUserId: ownerId,
        proposalId: parentProposalId,
      })).resolves.toMatchObject({
        ok: true,
        value: { status: AI_DOCUMENT_PROPOSAL_STATUS.STALE },
      })

      const archivedTargetProposalId = '00000000-0000-4000-8000-0000000003c2'
      await repository.create({
        id: archivedTargetProposalId,
        projectId,
        userId: ownerId,
        conversationId,
        turnRequestId: '00000000-0000-4000-8000-0000000003c3',
        kind: AI_DOCUMENT_PROPOSAL_KIND.UPDATE,
        targetDocumentId: parent.value.documentId,
        requestedParentId: null,
        expectedDraftRevision: 0,
        baseTitle: 'Parent',
        baseContent: emptyContent,
        proposedTitle: 'Archived target edit',
        proposedContent,
        contentHash: '2'.repeat(64),
        expiresAt,
        now,
      })
      await expect(confirm({
        projectId,
        actorUserId: ownerId,
        proposalId: archivedTargetProposalId,
      })).resolves.toMatchObject({
        ok: true,
        value: { status: AI_DOCUMENT_PROPOSAL_STATUS.STALE },
      })

      const imageProposalId = '00000000-0000-4000-8000-0000000003bf'
      await repository.create({
        id: imageProposalId,
        projectId,
        userId: ownerId,
        conversationId,
        turnRequestId: '00000000-0000-4000-8000-0000000003c0',
        kind: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
        targetDocumentId: null,
        requestedParentId: null,
        expectedDraftRevision: null,
        baseTitle: null,
        baseContent: null,
        proposedTitle: 'Missing image',
        proposedContent: {
          type: 'doc',
          content: [{
            type: 'image',
            attrs: {
              imageId: '00000000-0000-4000-8000-0000000003c1',
              alt: 'Missing',
            },
          }],
        },
        contentHash: '1'.repeat(64),
        expiresAt,
        now,
      })
      await expect(confirm({
        projectId,
        actorUserId: ownerId,
        proposalId: imageProposalId,
      })).resolves.toMatchObject({
        ok: true,
        value: { status: AI_DOCUMENT_PROPOSAL_STATUS.STALE },
      })
      const effects = await database.queryClient<{ count: number }[]>`
        select count(*)::int as count
        from documents
        where project_id = ${projectId} and id <> ${parent.value.documentId}
      `
      expect(effects).toEqual([{ count: 0 }])
    }
    finally {
      await database.close()
    }
  })
})
