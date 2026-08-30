import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import {
  projectAiConversationMessages,
  projectAiConversations,
} from '../../../server/infrastructure/database/schema/ai-assistant'

describe('AI conversation tables', () => {
  it('stores owner-scoped retention state separately from visible messages', () => {
    const conversations = getTableConfig(projectAiConversations)
    const messages = getTableConfig(projectAiConversationMessages)

    expect(conversations.columns.map(column => column.name)).toEqual(expect.arrayContaining([
      'project_id', 'user_id', 'title', 'expires_at', 'deleted_at', 'purge_after',
    ]))
    expect(conversations.checks.map(check => check.name)).toContain(
      'project_ai_conversations_deletion_pair_check',
    )
    expect(messages.columns.map(column => column.name)).toEqual(expect.arrayContaining([
      'conversation_id', 'role', 'content', 'citations', 'turn_request_id', 'created_at',
    ]))
    expect(messages.columns.map(column => column.name)).not.toEqual(expect.arrayContaining([
      'prompt', 'provider_payload', 'tool_result', 'excerpt',
    ]))
  })
})
