import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
} from 'drizzle-orm'
import { AI_CONVERSATION_MESSAGE_ROLE, AI_CONVERSATION_STATUS } from '../../../shared/ai-assistant/constants'
import { projectAssistantCitationSchema } from '../../../shared/ai-assistant/contracts'
import type { getDatabase } from '../../infrastructure/database/client'
import {
  projectAiConversationMessages,
  projectAiConversations,
} from '../../infrastructure/database/schema/ai-assistant'
import {
  decodeConversationCursor,
  encodeConversationCursor,
} from './conversation-cursor'
import type {
  ProjectAiConversationRepository,
  StoredProjectAiConversation,
  StoredProjectAiConversationMessage,
} from './project-ai-conversations'

type Database = ReturnType<typeof getDatabase>['db']

const titleFromQuestion = (content: string): string => {
  const line = content.trim().replace(/\s+/gu, ' ')
  return line.length <= 120 ? line : `${line.slice(0, 119).trimEnd()}…`
}

export const createProjectAiConversationRepository = (
  db: Database,
): ProjectAiConversationRepository => ({
  async create(command) {
    const [created] = await db.insert(projectAiConversations).values({
      id: command.id,
      projectId: command.projectId,
      userId: command.userId,
      title: command.title,
      expiresAt: command.expiresAt,
      createdAt: command.now,
      updatedAt: command.now,
    }).returning()
    if (!created) throw new Error('Conversation insert did not return a row')
    return created
  },

  async list(query) {
    const cursor = decodeConversationCursor(query.cursor, query.status)
    const timestampColumn = query.status === AI_CONVERSATION_STATUS.ACTIVE
      ? projectAiConversations.updatedAt
      : projectAiConversations.deletedAt
    const statusCondition = query.status === AI_CONVERSATION_STATUS.ACTIVE
      ? and(isNull(projectAiConversations.deletedAt), gt(projectAiConversations.expiresAt, query.now))
      : and(
          isNotNull(projectAiConversations.deletedAt),
          isNotNull(projectAiConversations.purgeAfter),
          gt(projectAiConversations.purgeAfter, query.now),
        )
    const cursorCondition = cursor === null
      ? undefined
      : or(
          lt(timestampColumn, cursor.timestamp),
          and(eq(timestampColumn, cursor.timestamp), lt(projectAiConversations.id, cursor.id)),
        )
    const rows = await db.select().from(projectAiConversations).where(and(
      eq(projectAiConversations.projectId, query.projectId),
      eq(projectAiConversations.userId, query.userId),
      statusCondition,
      cursorCondition,
    )).orderBy(desc(timestampColumn), desc(projectAiConversations.id)).limit(query.limit + 1)
    const records = rows.slice(0, query.limit)
    const last = records.at(-1)
    const lastTimestamp = query.status === AI_CONVERSATION_STATUS.ACTIVE
      ? last?.updatedAt
      : last?.deletedAt
    return {
      records,
      nextCursor: rows.length > query.limit && last && lastTimestamp
        ? encodeConversationCursor({ scope: query.status, timestamp: lastTimestamp, id: last.id })
        : null,
    }
  },

  async loadOwned(query) {
    const [record] = await db.select().from(projectAiConversations).where(and(
      eq(projectAiConversations.id, query.conversationId),
      eq(projectAiConversations.projectId, query.projectId),
      eq(projectAiConversations.userId, query.userId),
      or(
        and(isNull(projectAiConversations.deletedAt), gt(projectAiConversations.expiresAt, query.now)),
        and(isNotNull(projectAiConversations.purgeAfter), gt(projectAiConversations.purgeAfter, query.now)),
      ),
    )).limit(1)
    return record ?? null
  },

  async listMessages(query) {
    const cursor = decodeConversationCursor(query.cursor, 'messages')
    const cursorCondition = cursor === null
      ? undefined
      : or(
          lt(projectAiConversationMessages.createdAt, cursor.timestamp),
          and(
            eq(projectAiConversationMessages.createdAt, cursor.timestamp),
            lt(projectAiConversationMessages.id, cursor.id),
          ),
        )
    const rows = await db.select({
      id: projectAiConversationMessages.id,
      role: projectAiConversationMessages.role,
      content: projectAiConversationMessages.content,
      citations: projectAiConversationMessages.citations,
      createdAt: projectAiConversationMessages.createdAt,
    }).from(projectAiConversationMessages).innerJoin(
      projectAiConversations,
      eq(projectAiConversationMessages.conversationId, projectAiConversations.id),
    ).where(and(
      eq(projectAiConversations.id, query.conversationId),
      eq(projectAiConversations.projectId, query.projectId),
      eq(projectAiConversations.userId, query.userId),
      cursorCondition,
    )).orderBy(
      desc(projectAiConversationMessages.createdAt),
      desc(projectAiConversationMessages.id),
    ).limit(query.limit + 1)
    const page: readonly StoredProjectAiConversationMessage[] = rows.slice(0, query.limit).map(row => ({
      ...row,
      citations: projectAssistantCitationSchema.array().max(8).parse(row.citations),
    }))
    const oldest = page.at(-1)
    return {
      records: page.toReversed(),
      nextCursor: rows.length > query.limit && oldest
        ? encodeConversationCursor({ scope: 'messages', timestamp: oldest.createdAt, id: oldest.id })
        : null,
    }
  },

  async archive(command) {
    const [record] = await db.update(projectAiConversations).set({
      deletedAt: command.now,
      purgeAfter: command.purgeAfter,
      updatedAt: command.now,
    }).where(and(
      eq(projectAiConversations.id, command.conversationId),
      eq(projectAiConversations.projectId, command.projectId),
      eq(projectAiConversations.userId, command.userId),
      isNull(projectAiConversations.deletedAt),
      gt(projectAiConversations.expiresAt, command.now),
    )).returning()
    return record ?? null
  },

  async restore(command) {
    const [record] = await db.update(projectAiConversations).set({
      deletedAt: null,
      purgeAfter: null,
      expiresAt: command.expiresAt,
      updatedAt: command.now,
    }).where(and(
      eq(projectAiConversations.id, command.conversationId),
      eq(projectAiConversations.projectId, command.projectId),
      eq(projectAiConversations.userId, command.userId),
      isNotNull(projectAiConversations.deletedAt),
      isNotNull(projectAiConversations.purgeAfter),
      gt(projectAiConversations.purgeAfter, command.now),
    )).returning()
    return record ?? null
  },

  async appendMessage(command) {
    return db.transaction(async (tx): Promise<boolean> => {
      const [existingMessage] = await tx.select({ id: projectAiConversationMessages.id })
        .from(projectAiConversationMessages)
        .where(eq(projectAiConversationMessages.conversationId, command.conversationId))
        .limit(1)
      const [conversation] = await tx.update(projectAiConversations).set({
        expiresAt: command.expiresAt,
        updatedAt: command.now,
        ...(command.role === AI_CONVERSATION_MESSAGE_ROLE.USER && !existingMessage
          ? { title: titleFromQuestion(command.content) }
          : {}),
      }).where(and(
        eq(projectAiConversations.id, command.conversationId),
        eq(projectAiConversations.projectId, command.projectId),
        eq(projectAiConversations.userId, command.userId),
        isNull(projectAiConversations.deletedAt),
        gt(projectAiConversations.expiresAt, command.now),
      )).returning({ id: projectAiConversations.id })
      if (!conversation) return false

      await tx.insert(projectAiConversationMessages).values({
        id: command.id,
        conversationId: command.conversationId,
        role: command.role,
        content: command.content,
        citations: [...command.citations],
        turnRequestId: command.requestId,
        createdAt: command.now,
      }).onConflictDoNothing()
      return true
    })
  },

  async purgeEligible(command) {
    const candidates = await db.select({ id: projectAiConversations.id })
      .from(projectAiConversations)
      .where(or(
        and(isNull(projectAiConversations.deletedAt), lte(projectAiConversations.expiresAt, command.now)),
        and(isNotNull(projectAiConversations.purgeAfter), lte(projectAiConversations.purgeAfter, command.now)),
      ))
      .orderBy(projectAiConversations.expiresAt, projectAiConversations.purgeAfter)
      .limit(command.limit)
    if (candidates.length === 0) return 0
    const deleted = await db.delete(projectAiConversations).where(and(
      inArray(projectAiConversations.id, candidates.map(candidate => candidate.id)),
      or(
        and(isNull(projectAiConversations.deletedAt), lte(projectAiConversations.expiresAt, command.now)),
        and(isNotNull(projectAiConversations.purgeAfter), lte(projectAiConversations.purgeAfter, command.now)),
      ),
    )).returning({ id: projectAiConversations.id })
    return deleted.length
  },
})
