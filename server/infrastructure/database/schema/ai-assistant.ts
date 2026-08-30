import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  AI_CONNECTION_STATUS,
  AI_ASSISTANT_ANSWER_MAX_LENGTH,
  AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES,
  AI_DOCUMENT_PROPOSAL_KIND,
  AI_DOCUMENT_PROPOSAL_STATUS,
  AI_CONVERSATION_MESSAGE_ROLE,
  AI_CONVERSATION_TITLE_MAX_LENGTH,
  AI_MAX_OUTPUT_TOKENS_MAX,
  AI_MAX_OUTPUT_TOKENS_MIN,
  AI_MODEL_MAX_LENGTH,
  AI_PROVIDER,
  AI_REQUEST_TIMEOUT_MS_MAX,
  AI_REQUEST_TIMEOUT_MS_MIN,
  AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH,
  AI_TURN_ERROR_CODE_MAX_LENGTH,
  AI_TURN_OUTCOME,
} from '../../../../shared/ai-assistant/constants'
import type { DocumentContent } from '../../../../shared/documents/contracts'
import { user } from './auth'
import { projects } from './projects'

const enumValues = <T extends Record<string, string>>(values: T) =>
  Object.values(values) as [T[keyof T], ...T[keyof T][]]
const enumSql = (values: Record<string, string>) =>
  sql.raw(Object.values(values).map(value => `'${value.replaceAll("'", "''")}'`).join(', '))
const numberSql = (value: number) => sql.raw(String(value))
const literalSql = (value: string) => sql.raw(`'${value.replaceAll("'", "''")}'`)
const timezoneTimestamp = (name: string) => timestamp(name, { withTimezone: true })

export const projectAiConnections = pgTable('project_ai_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: enumValues(AI_PROVIDER) }).notNull(),
  model: text('model').notNull(),
  apiKeyCiphertext: text('api_key_ciphertext').notNull(),
  apiKeyNonce: text('api_key_nonce').notNull(),
  apiKeyKeyVersion: integer('api_key_key_version').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  status: text('status', { enum: enumValues(AI_CONNECTION_STATUS) })
    .default(AI_CONNECTION_STATUS.UNVERIFIED)
    .notNull(),
  systemInstructions: text('system_instructions'),
  maxOutputTokens: integer('max_output_tokens').default(2048).notNull(),
  requestTimeoutMs: integer('request_timeout_ms').default(30_000).notNull(),
  lastValidatedAt: timezoneTimestamp('last_validated_at'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  updatedByUserId: uuid('updated_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  unique('project_ai_connections_project_id_unique').on(table.projectId),
  check('project_ai_connections_provider_check', sql`${table.provider} in (${enumSql(AI_PROVIDER)})`),
  check('project_ai_connections_status_check', sql`${table.status} in (${enumSql(AI_CONNECTION_STATUS)})`),
  check('project_ai_connections_model_check', sql`
    ${table.model} = btrim(${table.model})
    and char_length(${table.model}) between 1 and ${numberSql(AI_MODEL_MAX_LENGTH)}
  `),
  check('project_ai_connections_api_key_envelope_check', sql`
    char_length(${table.apiKeyCiphertext}) > 0
    and char_length(${table.apiKeyNonce}) > 0
    and ${table.apiKeyKeyVersion} > 0
  `),
  check('project_ai_connections_system_instructions_check', sql`
    ${table.systemInstructions} is null
    or (
      ${table.systemInstructions} = btrim(${table.systemInstructions})
      and char_length(${table.systemInstructions}) between 1 and ${numberSql(AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH)}
    )
  `),
  check('project_ai_connections_limits_check', sql`
    ${table.maxOutputTokens} between ${numberSql(AI_MAX_OUTPUT_TOKENS_MIN)} and ${numberSql(AI_MAX_OUTPUT_TOKENS_MAX)}
    and ${table.requestTimeoutMs} between ${numberSql(AI_REQUEST_TIMEOUT_MS_MIN)} and ${numberSql(AI_REQUEST_TIMEOUT_MS_MAX)}
  `),
  index('project_ai_connections_status_idx').on(table.status),
  index('project_ai_connections_updated_by_user_id_idx').on(table.updatedByUserId),
])

export const projectAiConnectionsRelations = relations(projectAiConnections, ({ one }) => ({
  project: one(projects, { fields: [projectAiConnections.projectId], references: [projects.id] }),
  createdBy: one(user, {
    fields: [projectAiConnections.createdByUserId],
    references: [user.id],
    relationName: 'projectAiConnectionCreator',
  }),
  updatedBy: one(user, {
    fields: [projectAiConnections.updatedByUserId],
    references: [user.id],
    relationName: 'projectAiConnectionUpdater',
  }),
}))

export const projectAiTurnControls = pgTable('project_ai_turn_controls', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  rateWindowStartedAt: timezoneTimestamp('rate_window_started_at').notNull(),
  rateCount: integer('rate_count').default(0).notNull(),
  leaseToken: uuid('lease_token'),
  leaseExpiresAt: timezoneTimestamp('lease_expires_at'),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  unique('project_ai_turn_controls_project_user_unique').on(table.projectId, table.userId),
  check('project_ai_turn_controls_rate_count_check', sql`${table.rateCount} >= 0`),
  check('project_ai_turn_controls_lease_pair_check', sql`
    (${table.leaseToken} is null and ${table.leaseExpiresAt} is null)
    or (${table.leaseToken} is not null and ${table.leaseExpiresAt} is not null)
  `),
  index('project_ai_turn_controls_lease_expires_at_idx').on(table.leaseExpiresAt),
])

export const projectAiUsageEvents = pgTable('project_ai_usage_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  connectionId: uuid('connection_id').references(() => projectAiConnections.id, { onDelete: 'set null' }),
  requestId: uuid('request_id').notNull(),
  provider: text('provider', { enum: enumValues(AI_PROVIDER) }).notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  durationMs: integer('duration_ms').notNull(),
  outcome: text('outcome', { enum: enumValues(AI_TURN_OUTCOME) }).notNull(),
  errorCode: text('error_code'),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
}, table => [
  unique('project_ai_usage_events_request_id_unique').on(table.requestId),
  check('project_ai_usage_events_provider_check', sql`${table.provider} in (${enumSql(AI_PROVIDER)})`),
  check('project_ai_usage_events_outcome_check', sql`${table.outcome} in (${enumSql(AI_TURN_OUTCOME)})`),
  check('project_ai_usage_events_model_check', sql`
    ${table.model} = btrim(${table.model})
    and char_length(${table.model}) between 1 and ${numberSql(AI_MODEL_MAX_LENGTH)}
  `),
  check('project_ai_usage_events_numbers_check', sql`
    (${table.inputTokens} is null or ${table.inputTokens} >= 0)
    and (${table.outputTokens} is null or ${table.outputTokens} >= 0)
    and ${table.durationMs} >= 0
  `),
  check('project_ai_usage_events_error_code_check', sql`
    ${table.errorCode} is null
    or (
      ${table.errorCode} = btrim(${table.errorCode})
      and char_length(${table.errorCode}) between 1 and ${numberSql(AI_TURN_ERROR_CODE_MAX_LENGTH)}
    )
  `),
  index('project_ai_usage_events_project_created_at_idx').on(table.projectId, table.createdAt),
  index('project_ai_usage_events_user_created_at_idx').on(table.userId, table.createdAt),
])

export const projectAiConversations = pgTable('project_ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  expiresAt: timezoneTimestamp('expires_at').notNull(),
  deletedAt: timezoneTimestamp('deleted_at'),
  purgeAfter: timezoneTimestamp('purge_after'),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  check('project_ai_conversations_title_check', sql`
    ${table.title} = btrim(${table.title})
    and char_length(${table.title}) between 1 and ${numberSql(AI_CONVERSATION_TITLE_MAX_LENGTH)}
  `),
  check('project_ai_conversations_deletion_pair_check', sql`
    (${table.deletedAt} is null and ${table.purgeAfter} is null)
    or (${table.deletedAt} is not null and ${table.purgeAfter} is not null)
  `),
  index('project_ai_conversations_owner_active_idx')
    .on(table.projectId, table.userId, table.deletedAt, table.updatedAt),
  index('project_ai_conversations_cleanup_idx').on(table.purgeAfter, table.expiresAt),
])

export const projectAiConversationMessages = pgTable('project_ai_conversation_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull()
    .references(() => projectAiConversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: enumValues(AI_CONVERSATION_MESSAGE_ROLE) }).notNull(),
  content: text('content').notNull(),
  citations: jsonb('citations').default([]).notNull(),
  turnRequestId: uuid('turn_request_id').notNull(),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
}, table => [
  check('project_ai_conversation_messages_role_check', sql`
    ${table.role} in (${enumSql(AI_CONVERSATION_MESSAGE_ROLE)})
  `),
  check('project_ai_conversation_messages_content_check', sql`
    char_length(${table.content}) between 1 and ${numberSql(AI_ASSISTANT_ANSWER_MAX_LENGTH)}
  `),
  check('project_ai_conversation_messages_citations_check', sql`
    jsonb_typeof(${table.citations}) = 'array'
  `),
  uniqueIndex('project_ai_conversation_messages_turn_role_unique')
    .on(table.conversationId, table.turnRequestId, table.role),
  index('project_ai_conversation_messages_conversation_created_idx')
    .on(table.conversationId, table.createdAt, table.id),
])

export const projectAiConversationsRelations = relations(projectAiConversations, ({ many, one }) => ({
  project: one(projects, { fields: [projectAiConversations.projectId], references: [projects.id] }),
  user: one(user, { fields: [projectAiConversations.userId], references: [user.id] }),
  messages: many(projectAiConversationMessages),
}))

export const projectAiConversationMessagesRelations = relations(
  projectAiConversationMessages,
  ({ one }) => ({
    conversation: one(projectAiConversations, {
      fields: [projectAiConversationMessages.conversationId],
      references: [projectAiConversations.id],
    }),
  }),
)

export const projectAiDocumentProposals = pgTable('project_ai_document_proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  conversationId: uuid('conversation_id').notNull()
    .references(() => projectAiConversations.id, { onDelete: 'cascade' }),
  turnRequestId: uuid('turn_request_id').notNull(),
  kind: text('kind', { enum: enumValues(AI_DOCUMENT_PROPOSAL_KIND) }).notNull(),
  status: text('status', { enum: enumValues(AI_DOCUMENT_PROPOSAL_STATUS) })
    .default(AI_DOCUMENT_PROPOSAL_STATUS.PENDING)
    .notNull(),
  targetDocumentId: uuid('target_document_id'),
  requestedParentId: uuid('requested_parent_id'),
  expectedDraftRevision: integer('expected_draft_revision'),
  baseTitle: text('base_title'),
  baseContent: jsonb('base_content').$type<DocumentContent>(),
  proposedTitle: text('proposed_title'),
  proposedContent: jsonb('proposed_content').$type<DocumentContent>(),
  contentHash: text('content_hash'),
  appliedDocumentId: uuid('applied_document_id'),
  appliedDraftRevision: integer('applied_draft_revision'),
  expiresAt: timezoneTimestamp('expires_at').notNull(),
  decidedAt: timezoneTimestamp('decided_at'),
  purgeAfter: timezoneTimestamp('purge_after'),
  createdAt: timezoneTimestamp('created_at').defaultNow().notNull(),
  updatedAt: timezoneTimestamp('updated_at').defaultNow().notNull(),
}, table => [
  unique('project_ai_document_proposals_turn_unique')
    .on(table.projectId, table.userId, table.conversationId, table.turnRequestId),
  check('project_ai_document_proposals_kind_check', sql`
    ${table.kind} in (${enumSql(AI_DOCUMENT_PROPOSAL_KIND)})
  `),
  check('project_ai_document_proposals_status_check', sql`
    ${table.status} in (${enumSql(AI_DOCUMENT_PROPOSAL_STATUS)})
  `),
  check('project_ai_document_proposals_payload_check', sql`
    (
      ${table.status} = ${literalSql(AI_DOCUMENT_PROPOSAL_STATUS.PENDING)}
      and ${table.proposedTitle} is not null
      and ${table.proposedContent} is not null
      and ${table.contentHash} is not null
      and ${table.decidedAt} is null
      and ${table.purgeAfter} is null
      and (
        (
          ${table.kind} = ${literalSql(AI_DOCUMENT_PROPOSAL_KIND.CREATE)}
          and ${table.targetDocumentId} is null
          and ${table.expectedDraftRevision} is null
          and ${table.baseTitle} is null
          and ${table.baseContent} is null
        )
        or (
          ${table.kind} = ${literalSql(AI_DOCUMENT_PROPOSAL_KIND.UPDATE)}
          and ${table.requestedParentId} is null
          and ${table.targetDocumentId} is not null
          and ${table.expectedDraftRevision} >= 0
          and ${table.baseTitle} is not null
          and ${table.baseContent} is not null
        )
      )
    )
    or (
      ${table.status} <> ${literalSql(AI_DOCUMENT_PROPOSAL_STATUS.PENDING)}
      and ${table.targetDocumentId} is null
      and ${table.requestedParentId} is null
      and ${table.expectedDraftRevision} is null
      and ${table.baseTitle} is null
      and ${table.baseContent} is null
      and ${table.proposedTitle} is null
      and ${table.proposedContent} is null
      and ${table.contentHash} is null
      and ${table.decidedAt} is not null
      and ${table.purgeAfter} is not null
    )
  `),
  check('project_ai_document_proposals_content_size_check', sql`
    (${table.baseContent} is null or octet_length(${table.baseContent}::text) <= ${numberSql(AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES)})
    and (${table.proposedContent} is null or octet_length(${table.proposedContent}::text) <= ${numberSql(AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES)})
    and (${table.baseTitle} is null or (${table.baseTitle} = btrim(${table.baseTitle}) and char_length(${table.baseTitle}) between 1 and 200))
    and (${table.proposedTitle} is null or (${table.proposedTitle} = btrim(${table.proposedTitle}) and char_length(${table.proposedTitle}) between 1 and 200))
    and (${table.contentHash} is null or ${table.contentHash} ~ '^[0-9a-f]{64}$')
  `),
  check('project_ai_document_proposals_receipt_check', sql`
    (
      ${table.status} = ${literalSql(AI_DOCUMENT_PROPOSAL_STATUS.APPLIED)}
      and ${table.appliedDocumentId} is not null
      and ${table.appliedDraftRevision} >= 0
    )
    or (
      ${table.status} <> ${literalSql(AI_DOCUMENT_PROPOSAL_STATUS.APPLIED)}
      and ${table.appliedDocumentId} is null
      and ${table.appliedDraftRevision} is null
    )
  `),
  check('project_ai_document_proposals_time_check', sql`
    ${table.expiresAt} > ${table.createdAt}
    and (${table.purgeAfter} is null or ${table.purgeAfter} > ${table.decidedAt})
  `),
  index('project_ai_document_proposals_owner_status_idx')
    .on(table.projectId, table.userId, table.status, table.createdAt),
  index('project_ai_document_proposals_cleanup_idx')
    .on(table.status, table.expiresAt, table.purgeAfter),
])
