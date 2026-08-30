import { randomUUID } from 'node:crypto'
import type {
  ProjectAiConversation,
  ProjectAiConversationListResponse,
  ProjectAiConversationMessage,
  ProjectAiConversationMessagesResponse,
  ProjectAssistantCitation,
} from '../../../shared/ai-assistant/contracts'
import {
  AI_CONVERSATION_STATUS,
  type AI_CONVERSATION_MESSAGE_ROLE,
} from '../../../shared/ai-assistant/constants'
import { PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type {
  ProjectAssistantAccessDecision,
  ProjectAssistantAuthorizationInput,
} from './authorize-project-assistant'
import {
  activeConversationExpiresAt,
  archivedConversationPurgeAt,
} from './conversation-retention'

export const PROJECT_AI_CONVERSATION_ERROR = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
} as const

type ProjectAiConversationError =
  typeof PROJECT_AI_CONVERSATION_ERROR[keyof typeof PROJECT_AI_CONVERSATION_ERROR]
type Result<Value> =
  | { readonly ok: true, readonly value: Value }
  | { readonly ok: false, readonly code: ProjectAiConversationError }

export interface StoredProjectAiConversation {
  readonly id: string
  readonly projectId: string
  readonly userId: string
  readonly title: string
  readonly expiresAt: Date
  readonly deletedAt: Date | null
  readonly purgeAfter: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface StoredProjectAiConversationMessage {
  readonly id: string
  readonly role: typeof AI_CONVERSATION_MESSAGE_ROLE[keyof typeof AI_CONVERSATION_MESSAGE_ROLE]
  readonly content: string
  readonly citations: readonly ProjectAssistantCitation[]
  readonly createdAt: Date
}

interface OwnerScope {
  readonly projectId: string
  readonly userId: string
}

interface ConversationScope extends OwnerScope {
  readonly conversationId: string
}

export interface ProjectAiConversationRepository {
  readonly create: (command: OwnerScope & Readonly<{
    id: string
    title: string
    now: Date
    expiresAt: Date
  }>) => Promise<StoredProjectAiConversation>
  readonly list: (query: OwnerScope & Readonly<{
    status: typeof AI_CONVERSATION_STATUS[keyof typeof AI_CONVERSATION_STATUS]
    cursor?: string
    limit: number
    now: Date
  }>) => Promise<Readonly<{
    records: readonly StoredProjectAiConversation[]
    nextCursor: string | null
  }>>
  readonly loadOwned: (query: ConversationScope & Readonly<{ now: Date }>) =>
    Promise<StoredProjectAiConversation | null>
  readonly listMessages: (query: ConversationScope & Readonly<{
    cursor?: string
    limit: number
  }>) => Promise<Readonly<{
    records: readonly StoredProjectAiConversationMessage[]
    nextCursor: string | null
  }>>
  readonly archive: (command: ConversationScope & Readonly<{
    now: Date
    purgeAfter: Date
  }>) => Promise<StoredProjectAiConversation | null>
  readonly restore: (command: ConversationScope & Readonly<{
    now: Date
    expiresAt: Date
  }>) => Promise<StoredProjectAiConversation | null>
  readonly appendMessage: (command: ConversationScope & Readonly<{
    id: string
    requestId: string
    role: StoredProjectAiConversationMessage['role']
    content: string
    citations: readonly ProjectAssistantCitation[]
    now: Date
    expiresAt: Date
  }>) => Promise<boolean>
  readonly purgeEligible: (command: Readonly<{ now: Date, limit: number }>) => Promise<number>
}

interface Dependencies {
  readonly authorize: (input: ProjectAssistantAuthorizationInput) => Promise<ProjectAssistantAccessDecision>
  readonly repository: ProjectAiConversationRepository
  readonly createId?: () => string
  readonly now?: () => Date
}

interface ActorInput {
  readonly projectId: string
  readonly actorUserId: string
}

interface ConversationInput extends ActorInput {
  readonly conversationId: string
}

const toConversation = (record: StoredProjectAiConversation): ProjectAiConversation => ({
  id: record.id,
  title: record.title,
  expiresAt: record.expiresAt.toISOString(),
  deletedAt: record.deletedAt?.toISOString() ?? null,
  purgeAfter: record.purgeAfter?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})

const toMessage = (record: StoredProjectAiConversationMessage): ProjectAiConversationMessage => ({
  id: record.id,
  role: record.role,
  content: record.content,
  citations: record.citations,
  createdAt: record.createdAt.toISOString(),
})

const authorizeUse = async (
  authorize: Dependencies['authorize'],
  input: ActorInput,
): Promise<Result<true>> => {
  const decision = await authorize({
    projectId: input.projectId,
    userId: input.actorUserId,
    permission: PROJECT_PERMISSION.PROJECT_AI_USE,
  })
  return decision.allowed
    ? { ok: true, value: true }
    : { ok: false, code: PROJECT_AI_CONVERSATION_ERROR.PERMISSION_DENIED }
}

export const createProjectAiConversationService = (dependencies: Dependencies) => {
  const createId = dependencies.createId ?? randomUUID
  const currentTime = dependencies.now ?? (() => new Date())

  const access = (input: ActorInput) => authorizeUse(dependencies.authorize, input)
  const owner = (input: ActorInput): OwnerScope => ({
    projectId: input.projectId,
    userId: input.actorUserId,
  })

  return Object.freeze({
    async create(input: ActorInput): Promise<Result<Readonly<{ conversation: ProjectAiConversation }>>> {
      const allowed = await access(input)
      if (!allowed.ok) return allowed
      const now = currentTime()
      const record = await dependencies.repository.create({
        ...owner(input),
        id: createId(),
        title: 'Новый диалог',
        now,
        expiresAt: activeConversationExpiresAt(now),
      })
      return { ok: true, value: { conversation: toConversation(record) } }
    },

    async list(input: ActorInput & Readonly<{
      status: typeof AI_CONVERSATION_STATUS[keyof typeof AI_CONVERSATION_STATUS]
      cursor?: string
      limit: number
    }>): Promise<Result<ProjectAiConversationListResponse>> {
      const allowed = await access(input)
      if (!allowed.ok) return allowed
      const now = currentTime()
      await dependencies.repository.purgeEligible({ now, limit: 100 })
      const page = await dependencies.repository.list({
        ...owner(input),
        status: input.status,
        cursor: input.cursor,
        limit: input.limit,
        now,
      })
      return {
        ok: true,
        value: { conversations: page.records.map(toConversation), nextCursor: page.nextCursor },
      }
    },

    async readMessages(input: ConversationInput & Readonly<{
      cursor?: string
      limit: number
    }>): Promise<Result<ProjectAiConversationMessagesResponse>> {
      const allowed = await access(input)
      if (!allowed.ok) return allowed
      const now = currentTime()
      const scope = { ...owner(input), conversationId: input.conversationId }
      if (await dependencies.repository.loadOwned({ ...scope, now }) === null) {
        return { ok: false, code: PROJECT_AI_CONVERSATION_ERROR.NOT_FOUND }
      }
      const page = await dependencies.repository.listMessages({ ...scope, cursor: input.cursor, limit: input.limit })
      return { ok: true, value: { messages: page.records.map(toMessage), nextCursor: page.nextCursor } }
    },

    async archive(input: ConversationInput): Promise<Result<Readonly<{ conversation: ProjectAiConversation }>>> {
      const allowed = await access(input)
      if (!allowed.ok) return allowed
      const now = currentTime()
      const record = await dependencies.repository.archive({
        ...owner(input),
        conversationId: input.conversationId,
        now,
        purgeAfter: archivedConversationPurgeAt(now),
      })
      return record === null
        ? { ok: false, code: PROJECT_AI_CONVERSATION_ERROR.NOT_FOUND }
        : { ok: true, value: { conversation: toConversation(record) } }
    },

    async restore(input: ConversationInput): Promise<Result<Readonly<{ conversation: ProjectAiConversation }>>> {
      const allowed = await access(input)
      if (!allowed.ok) return allowed
      const now = currentTime()
      const record = await dependencies.repository.restore({
        ...owner(input),
        conversationId: input.conversationId,
        now,
        expiresAt: activeConversationExpiresAt(now),
      })
      return record === null
        ? { ok: false, code: PROJECT_AI_CONVERSATION_ERROR.NOT_FOUND }
        : { ok: true, value: { conversation: toConversation(record) } }
    },

    async appendMessage(input: ConversationInput & Readonly<{
      requestId: string
      role: StoredProjectAiConversationMessage['role']
      content: string
      citations: readonly ProjectAssistantCitation[]
    }>): Promise<Result<true>> {
      const allowed = await access(input)
      if (!allowed.ok) return allowed
      const now = currentTime()
      const saved = await dependencies.repository.appendMessage({
        ...owner(input),
        conversationId: input.conversationId,
        id: createId(),
        requestId: input.requestId,
        role: input.role,
        content: input.content,
        citations: input.citations,
        now,
        expiresAt: activeConversationExpiresAt(now),
      })
      return saved
        ? { ok: true, value: true }
        : { ok: false, code: PROJECT_AI_CONVERSATION_ERROR.NOT_FOUND }
    },
  })
}
