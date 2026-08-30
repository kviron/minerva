import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it } from 'vitest'
import { AI_CONVERSATION_MESSAGE_ROLE, AI_CONVERSATION_STATUS } from '../../../shared/ai-assistant/constants'
import { createProjectAiConversationRepository } from '../../../server/modules/ai-assistant/project-ai-conversation-repository'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const ownerId = '00000000-0000-4000-8000-0000000000a1'
const otherUserId = '00000000-0000-4000-8000-0000000000a2'
const projectId = '00000000-0000-4000-8000-0000000000a3'
const conversationId = '00000000-0000-4000-8000-0000000000a4'
const now = new Date('2026-07-30T12:00:00.000Z')

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
        (${ownerId}, 'Owner', 'owner-history@example.com', true, 'active'),
        (${otherUserId}, 'Other', 'other-history@example.com', true, 'active')
    `
    await database.queryClient`
      insert into projects (id, name, status, created_by_user_id)
      values (${projectId}, 'History', 'active', ${ownerId})
    `
  }
  finally {
    await database.close()
  }
})

describe('project AI conversation persistence', () => {
  it('keeps messages private to one project owner and supports recoverable deletion', async () => {
    const database = createTestDatabase()
    const repository = createProjectAiConversationRepository(database.db)
    try {
      await repository.create({
        id: conversationId,
        projectId,
        userId: ownerId,
        title: 'Новый диалог',
        now,
        expiresAt: new Date('2026-08-29T12:00:00.000Z'),
      })
      await repository.appendMessage({
        id: '00000000-0000-4000-8000-0000000000b1',
        requestId: '00000000-0000-4000-8000-0000000000c1',
        projectId,
        userId: ownerId,
        conversationId,
        role: AI_CONVERSATION_MESSAGE_ROLE.USER,
        content: 'Как проверяются права?',
        citations: [],
        now,
        expiresAt: new Date('2026-08-29T12:00:00.000Z'),
      })

      await expect(repository.loadOwned({ projectId, userId: otherUserId, conversationId, now }))
        .resolves.toBeNull()
      await expect(repository.list({
        projectId,
        userId: otherUserId,
        status: AI_CONVERSATION_STATUS.ACTIVE,
        limit: 20,
        now,
      })).resolves.toMatchObject({ records: [] })

      const archived = await repository.archive({
        projectId,
        userId: ownerId,
        conversationId,
        now,
        purgeAfter: new Date('2026-08-06T12:00:00.000Z'),
      })
      expect(archived?.deletedAt).toEqual(now)
      const restored = await repository.restore({
        projectId,
        userId: ownerId,
        conversationId,
        now: new Date('2026-07-31T12:00:00.000Z'),
        expiresAt: new Date('2026-08-30T12:00:00.000Z'),
      })
      expect(restored).toMatchObject({ deletedAt: null, purgeAfter: null })
    }
    finally {
      await database.close()
    }
  })
})
