import { describe, expect, it, vi } from 'vitest'
import {
  AI_DOCUMENT_PROPOSAL_KIND,
  AI_DOCUMENT_PROPOSAL_STATUS,
} from '../../../shared/ai-assistant/constants'
import { PROJECT_PERMISSION } from '../../../shared/projects/constants'
import {
  createProjectAiDocumentProposalService,
  PROJECT_AI_DOCUMENT_PROPOSAL_ERROR,
} from '../../../server/modules/ai-assistant/document-proposals'

const projectId = '00000000-0000-4000-8000-000000000301'
const userId = '00000000-0000-4000-8000-000000000302'
const conversationId = '00000000-0000-4000-8000-000000000303'
const proposalId = '00000000-0000-4000-8000-000000000304'
const turnRequestId = '00000000-0000-4000-8000-000000000305'
const documentId = '00000000-0000-4000-8000-000000000306'
const now = new Date('2026-07-31T12:00:00.000Z')
const content = { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Текст' }] }] }

const stored = {
  id: proposalId,
  projectId,
  userId,
  conversationId,
  turnRequestId,
  kind: AI_DOCUMENT_PROPOSAL_KIND.UPDATE,
  status: AI_DOCUMENT_PROPOSAL_STATUS.PENDING,
  targetDocumentId: documentId,
  requestedParentId: null,
  expectedDraftRevision: 2,
  baseTitle: 'Было',
  baseContent: content,
  proposedTitle: 'Стало',
  proposedContent: content,
  contentHash: 'a'.repeat(64),
  appliedDocumentId: null,
  appliedDraftRevision: null,
  expiresAt: new Date('2026-07-31T12:15:00.000Z'),
  decidedAt: null,
  purgeAfter: null,
  createdAt: now,
  updatedAt: now,
}

const createRepository = () => ({
  create: vi.fn(async (command: Readonly<{ contentHash: string }>) => ({
    ...stored,
    contentHash: command.contentHash,
  })),
  loadOwned: vi.fn().mockResolvedValue(stored),
  terminalizeOwned: vi.fn().mockResolvedValue({
    ...stored,
    status: AI_DOCUMENT_PROPOSAL_STATUS.REJECTED,
    targetDocumentId: null,
    expectedDraftRevision: null,
    baseTitle: null,
    baseContent: null,
    proposedTitle: null,
    proposedContent: null,
    contentHash: null,
    decidedAt: now,
    purgeAfter: new Date('2026-08-01T12:00:00.000Z'),
  }),
  expirePending: vi.fn(),
  purgeReceipts: vi.fn(),
})

describe('AI document proposal service', () => {
  it('requires current AI use and document view before storing validated content', async () => {
    const authorize = vi.fn().mockResolvedValue({ allowed: true })
    const repository = createRepository()
    const service = createProjectAiDocumentProposalService({
      authorize,
      repository,
      createId: () => proposalId,
      now: () => now,
    })

    const result = await service.create({
      kind: AI_DOCUMENT_PROPOSAL_KIND.UPDATE,
      projectId,
      actorUserId: userId,
      conversationId,
      turnRequestId,
      documentId,
      expectedDraftRevision: 2,
      baseTitle: 'Было',
      baseContent: content,
      proposedTitle: 'Стало',
      proposedContent: content,
    })

    expect(result).toMatchObject({ ok: true, value: { id: proposalId } })
    expect(authorize.mock.calls.map(call => call[0].permission)).toEqual([
      PROJECT_PERMISSION.PROJECT_AI_USE,
      PROJECT_PERMISSION.DOCUMENTS_VIEW,
    ])
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      id: proposalId,
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/u),
      expiresAt: new Date('2026-07-31T12:15:00.000Z'),
    }))
  })

  it('fails closed on invalid or oversized content before persistence', async () => {
    const repository = createRepository()
    const service = createProjectAiDocumentProposalService({
      authorize: vi.fn().mockResolvedValue({ allowed: true }),
      repository,
      createId: () => proposalId,
      now: () => now,
    })

    await expect(service.create({
      kind: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
      projectId,
      actorUserId: userId,
      conversationId,
      turnRequestId,
      parentId: null,
      proposedTitle: 'Новая',
      proposedContent: { type: 'doc', content: [{ type: 'script' }] },
    })).resolves.toEqual({ ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.INVALID_INPUT })
    await expect(service.create({
      kind: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
      projectId,
      actorUserId: userId,
      conversationId,
      turnRequestId,
      parentId: null,
      proposedTitle: 'Новая',
      proposedContent: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(70_000) }] }],
      },
    })).resolves.toEqual({ ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.CONTENT_TOO_LARGE })
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('rejects through a content-clearing terminal transition', async () => {
    const repository = createRepository()
    const service = createProjectAiDocumentProposalService({
      authorize: vi.fn().mockResolvedValue({ allowed: true }),
      repository,
      createId: () => proposalId,
      now: () => now,
    })

    await expect(service.reject({ projectId, actorUserId: userId, proposalId }))
      .resolves.toMatchObject({
        ok: true,
        value: { status: AI_DOCUMENT_PROPOSAL_STATUS.REJECTED, proposedTitle: null },
      })
    expect(repository.terminalizeOwned).toHaveBeenCalledWith(expect.objectContaining({
      status: AI_DOCUMENT_PROPOSAL_STATUS.REJECTED,
      clearPayload: true,
    }))
  })
})
