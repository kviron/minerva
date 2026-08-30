import { describe, expect, it, vi } from 'vitest'
import { AI_CONVERSATION_STATUS } from '../../../shared/ai-assistant/constants'
import { createProjectAiConversationService } from '../../../server/modules/ai-assistant/project-ai-conversations'

const projectId = '00000000-0000-4000-8000-000000000101'
const userId = '00000000-0000-4000-8000-000000000102'
const conversationId = '00000000-0000-4000-8000-000000000103'
const now = new Date('2026-07-30T12:00:00.000Z')
const stored = {
  id: conversationId,
  projectId,
  userId,
  title: 'Новый диалог',
  expiresAt: new Date('2026-08-29T12:00:00.000Z'),
  deletedAt: null,
  purgeAfter: null,
  createdAt: now,
  updatedAt: now,
}

const repository = () => ({
  create: vi.fn().mockResolvedValue(stored),
  list: vi.fn().mockResolvedValue({ records: [stored], nextCursor: null }),
  loadOwned: vi.fn().mockResolvedValue(stored),
  listMessages: vi.fn().mockResolvedValue({ records: [], nextCursor: null }),
  archive: vi.fn().mockResolvedValue({ ...stored, deletedAt: now, purgeAfter: new Date('2026-08-06T12:00:00.000Z') }),
  restore: vi.fn().mockResolvedValue(stored),
  appendMessage: vi.fn().mockResolvedValue(undefined),
  purgeEligible: vi.fn().mockResolvedValue(0),
})

describe('project AI conversation service', () => {
  it('fails closed before touching history without project.ai.use', async () => {
    const repo = repository()
    const service = createProjectAiConversationService({
      authorize: vi.fn().mockResolvedValue({ allowed: false, code: 'PERMISSION_DENIED' }),
      repository: repo,
      now: () => now,
    })

    await expect(service.list({ projectId, actorUserId: userId, status: AI_CONVERSATION_STATUS.ACTIVE, limit: 20 }))
      .resolves.toEqual({ ok: false, code: 'PERMISSION_DENIED' })
    expect(repo.list).not.toHaveBeenCalled()
    expect(repo.purgeEligible).not.toHaveBeenCalled()
  })

  it('always scopes reads and mutations to the current owner', async () => {
    const repo = repository()
    const service = createProjectAiConversationService({
      authorize: vi.fn().mockResolvedValue({ allowed: true }),
      repository: repo,
      now: () => now,
    })

    await service.readMessages({ projectId, actorUserId: userId, conversationId, limit: 20 })
    await service.archive({ projectId, actorUserId: userId, conversationId })

    expect(repo.loadOwned).toHaveBeenCalledWith({ projectId, userId, conversationId, now })
    expect(repo.archive).toHaveBeenCalledWith(expect.objectContaining({ projectId, userId, conversationId }))
  })

  it('renews retention when restoring from the recoverable trash', async () => {
    const repo = repository()
    const service = createProjectAiConversationService({
      authorize: vi.fn().mockResolvedValue({ allowed: true }),
      repository: repo,
      now: () => now,
    })

    await service.restore({ projectId, actorUserId: userId, conversationId })

    expect(repo.restore).toHaveBeenCalledWith({
      projectId,
      userId,
      conversationId,
      now,
      expiresAt: new Date('2026-08-29T12:00:00.000Z'),
    })
  })
})
