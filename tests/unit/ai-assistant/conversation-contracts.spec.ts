import { describe, expect, it } from 'vitest'
import {
  projectAiConversationCreateResponseSchema,
  projectAiConversationListResponseSchema,
  projectAiConversationMessagesResponseSchema,
} from '../../../shared/ai-assistant/contracts'

const conversationId = '00000000-0000-4000-8000-000000000201'
const documentId = '00000000-0000-4000-8000-000000000202'

describe('AI conversation contracts', () => {
  it('exposes only owner-safe conversation and visible-message projections', () => {
    const conversation = {
      id: conversationId,
      title: 'Как устроена авторизация?',
      createdAt: '2026-07-30T10:00:00.000Z',
      updatedAt: '2026-07-30T10:01:00.000Z',
      expiresAt: '2026-08-29T10:01:00.000Z',
      deletedAt: null,
      purgeAfter: null,
    }
    expect(projectAiConversationCreateResponseSchema.parse({ conversation }))
      .toEqual({ conversation })
    expect(projectAiConversationListResponseSchema.parse({
      conversations: [conversation],
      nextCursor: null,
    }).conversations).toHaveLength(1)
    expect(projectAiConversationMessagesResponseSchema.parse({
      messages: [{
        id: '00000000-0000-4000-8000-000000000203',
        role: 'assistant',
        content: 'Права проверяются на сервере.',
        citations: [{ documentId, title: 'Авторизация' }],
        createdAt: '2026-07-30T10:01:00.000Z',
      }],
      nextCursor: null,
    }).messages[0]).toMatchObject({ role: 'assistant' })

    expect(() => projectAiConversationListResponseSchema.parse({
      conversations: [{ ...conversation, userId: 'private-user-id' }],
      nextCursor: null,
    })).toThrow()
    expect(() => projectAiConversationMessagesResponseSchema.parse({
      messages: [{
        id: '00000000-0000-4000-8000-000000000203',
        role: 'tool',
        content: 'raw tool result',
        citations: [],
        createdAt: '2026-07-30T10:01:00.000Z',
      }],
      nextCursor: null,
    })).toThrow()
  })
})
