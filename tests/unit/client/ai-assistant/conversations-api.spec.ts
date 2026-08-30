import { describe, expect, it, vi } from 'vitest'
import { AI_CONVERSATION_STATUS } from '../../../../shared/ai-assistant/constants'
import { createProjectAiConversationsApi } from '../../../../app/features/ai-assistant/api/project-ai-conversations-api'

const projectId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'
const conversationId = '31b9fc31-6e20-4399-a2ea-fb4de1024821'
const conversation = {
  id: conversationId,
  title: 'Права доступа',
  createdAt: '2026-07-30T12:00:00.000Z',
  updatedAt: '2026-07-30T12:00:00.000Z',
  expiresAt: '2026-08-29T12:00:00.000Z',
  deletedAt: null,
  purgeAfter: null,
}

describe('project AI conversations API', () => {
  it('decodes owner-safe pages and sends scoped pagination as query data', async () => {
    const request = vi.fn().mockResolvedValue({ conversations: [conversation], nextCursor: 'next' })
    const api = createProjectAiConversationsApi(request)

    await expect(api.list(projectId, AI_CONVERSATION_STATUS.ACTIVE, 'cursor'))
      .resolves.toEqual({ conversations: [conversation], nextCursor: 'next' })
    expect(request).toHaveBeenCalledWith(
      `/api/projects/${projectId}/ai-assistant/conversations`,
      { query: { status: AI_CONVERSATION_STATUS.ACTIVE, cursor: 'cursor' }, signal: undefined },
    )
  })

  it('fails closed when a hidden transport field appears in a message', async () => {
    const request = vi.fn().mockResolvedValue({
      messages: [{
        id: '41b9fc31-6e20-4399-a2ea-fb4de1024821',
        role: 'assistant',
        content: 'Ответ',
        citations: [],
        createdAt: '2026-07-30T12:00:00.000Z',
        providerPayload: { secret: true },
      }],
      nextCursor: null,
    })

    await expect(createProjectAiConversationsApi(request).messages(projectId, conversationId))
      .rejects.toThrow()
  })
})
