import { z } from 'zod'
import {
  AI_API_KEY_MAX_LENGTH,
  AI_API_KEY_MIN_LENGTH,
  AI_ASSISTANT_AVAILABILITY,
  AI_DOCUMENT_PROPOSAL_DECISION,
  AI_DOCUMENT_PROPOSAL_KIND,
  AI_DOCUMENT_PROPOSAL_STATUS,
  AI_ASSISTANT_STREAM_ERROR,
  AI_ASSISTANT_STREAM_EVENT,
  AI_ASSISTANT_ANSWER_MAX_LENGTH,
  AI_CONNECTION_STATUS,
  AI_CONVERSATION_MESSAGE_ROLE,
  AI_CONVERSATION_PAGE_DEFAULT,
  AI_CONVERSATION_PAGE_MAX,
  AI_CONVERSATION_STATUS,
  AI_CONVERSATION_TITLE_MAX_LENGTH,
  AI_MAX_OUTPUT_TOKENS_MAX,
  AI_MAX_OUTPUT_TOKENS_MIN,
  AI_MODEL_MAX_LENGTH,
  AI_PROVIDER,
  AI_QUESTION_MAX_LENGTH,
  AI_REQUEST_TIMEOUT_MS_MAX,
  AI_REQUEST_TIMEOUT_MS_MIN,
  AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH,
} from './constants'

const modelSchema = z.string().trim().min(1).max(AI_MODEL_MAX_LENGTH)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u)

export const projectAiConnectionSchema = z.object({
  id: z.string().uuid(),
  provider: z.nativeEnum(AI_PROVIDER),
  model: modelSchema,
  enabled: z.boolean(),
  status: z.nativeEnum(AI_CONNECTION_STATUS),
  systemInstructions: z.string().max(AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH).nullable(),
  maxOutputTokens: z.number().int().min(AI_MAX_OUTPUT_TOKENS_MIN).max(AI_MAX_OUTPUT_TOKENS_MAX),
  requestTimeoutMs: z.number().int().min(AI_REQUEST_TIMEOUT_MS_MIN).max(AI_REQUEST_TIMEOUT_MS_MAX),
  lastValidatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict().readonly()

export const projectAiConnectionResponseSchema = z.object({
  connection: projectAiConnectionSchema.nullable(),
}).strict().readonly()

export const projectAiAvailabilityResponseSchema = z.object({
  availability: z.nativeEnum(AI_ASSISTANT_AVAILABILITY),
}).strict().readonly()

export const projectAiConnectionUpsertRequestSchema = z.object({
  provider: z.nativeEnum(AI_PROVIDER),
  model: modelSchema,
  apiKey: z.string().trim().min(AI_API_KEY_MIN_LENGTH).max(AI_API_KEY_MAX_LENGTH),
  enabled: z.boolean(),
  systemInstructions: z.string().trim().max(AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH).nullable().default(null),
  maxOutputTokens: z.number().int().min(AI_MAX_OUTPUT_TOKENS_MIN).max(AI_MAX_OUTPUT_TOKENS_MAX),
  requestTimeoutMs: z.number().int().min(AI_REQUEST_TIMEOUT_MS_MIN).max(AI_REQUEST_TIMEOUT_MS_MAX),
}).strict().readonly()

export const projectAiConnectionTestResponseSchema = z.object({
  connection: projectAiConnectionSchema,
  reachable: z.boolean(),
}).strict().readonly()

export const projectAiConnectionDisconnectResponseSchema = z.object({
  disconnected: z.literal(true),
}).strict().readonly()

export const projectAiRouteParamsSchema = z.object({
  id: z.string().uuid(),
}).strict().readonly()

export const projectAiDocumentProposalParamsSchema = z.object({
  id: z.string().uuid(),
  proposalId: z.string().uuid(),
}).strict().readonly()

export const projectAiDocumentProposalDecisionRequestSchema = z.object({
  decision: z.nativeEnum(AI_DOCUMENT_PROPOSAL_DECISION),
}).strict().readonly()

export const projectAiDocumentProposalProjectionSchema = z.object({
  id: z.string().uuid(),
  kind: z.nativeEnum(AI_DOCUMENT_PROPOSAL_KIND),
  status: z.nativeEnum(AI_DOCUMENT_PROPOSAL_STATUS),
  targetDocumentId: z.string().uuid().nullable(),
  proposedTitle: z.string().min(1).max(200).nullable(),
  expiresAt: z.string().datetime(),
  appliedDocumentId: z.string().uuid().nullable(),
  appliedDraftRevision: z.number().int().nonnegative().nullable(),
}).strict().readonly()

export const projectAssistantTurnRequestSchema = z.object({
  question: z.string().trim().min(1).max(AI_QUESTION_MAX_LENGTH),
  conversationId: z.string().uuid().optional(),
}).strict().readonly()

export const projectAssistantCitationSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1).max(200),
}).strict().readonly()

export const projectAssistantTurnResponseSchema = z.object({
  answer: z.string().min(1).max(AI_ASSISTANT_ANSWER_MAX_LENGTH),
  citations: z.array(projectAssistantCitationSchema).max(8).readonly(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
  }).strict().readonly(),
}).strict().readonly()

const projectAssistantUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
}).strict().readonly()

export const projectAssistantStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(AI_ASSISTANT_STREAM_EVENT.CONTEXT),
    citations: z.array(projectAssistantCitationSchema).max(8).readonly(),
  }).strict(),
  z.object({
    type: z.literal(AI_ASSISTANT_STREAM_EVENT.DELTA),
    delta: z.string().min(1).max(AI_ASSISTANT_ANSWER_MAX_LENGTH),
  }).strict(),
  z.object({
    type: z.literal(AI_ASSISTANT_STREAM_EVENT.COMPLETED),
    citations: z.array(projectAssistantCitationSchema).max(8).readonly(),
    usage: projectAssistantUsageSchema,
    proposal: projectAiDocumentProposalProjectionSchema.optional(),
  }).strict(),
  z.object({
    type: z.literal(AI_ASSISTANT_STREAM_EVENT.ERROR),
    code: z.nativeEnum(AI_ASSISTANT_STREAM_ERROR),
  }).strict(),
]).readonly()

export const projectAiConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(AI_CONVERSATION_TITLE_MAX_LENGTH),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  purgeAfter: z.string().datetime().nullable(),
}).strict().readonly()

export const projectAiConversationMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.nativeEnum(AI_CONVERSATION_MESSAGE_ROLE),
  content: z.string().min(1).max(AI_ASSISTANT_ANSWER_MAX_LENGTH),
  citations: z.array(projectAssistantCitationSchema).max(8).readonly(),
  createdAt: z.string().datetime(),
}).strict().readonly()

export const projectAiConversationCreateRequestSchema = z.object({}).strict().readonly()
export const projectAiConversationCreateResponseSchema = z.object({
  conversation: projectAiConversationSchema,
}).strict().readonly()
export const projectAiConversationListQuerySchema = z.object({
  status: z.nativeEnum(AI_CONVERSATION_STATUS).default(AI_CONVERSATION_STATUS.ACTIVE),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(AI_CONVERSATION_PAGE_MAX)
    .default(AI_CONVERSATION_PAGE_DEFAULT),
}).strict().readonly()
export const projectAiConversationListResponseSchema = z.object({
  conversations: z.array(projectAiConversationSchema).max(AI_CONVERSATION_PAGE_MAX).readonly(),
  nextCursor: z.string().max(512).nullable(),
}).strict().readonly()
export const projectAiConversationRouteParamsSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
}).strict().readonly()
export const projectAiConversationMessagesQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(AI_CONVERSATION_PAGE_MAX)
    .default(AI_CONVERSATION_PAGE_DEFAULT),
}).strict().readonly()
export const projectAiConversationMessagesResponseSchema = z.object({
  messages: z.array(projectAiConversationMessageSchema).max(AI_CONVERSATION_PAGE_MAX).readonly(),
  nextCursor: z.string().max(512).nullable(),
}).strict().readonly()
export const projectAiConversationMutationResponseSchema = projectAiConversationCreateResponseSchema

export type ProjectAiConnection = z.infer<typeof projectAiConnectionSchema>
export type ProjectAiConnectionResponse = z.infer<typeof projectAiConnectionResponseSchema>
export type ProjectAiAvailabilityResponse = z.infer<typeof projectAiAvailabilityResponseSchema>
export type ProjectAiDocumentProposalProjection = z.infer<typeof projectAiDocumentProposalProjectionSchema>
export type ProjectAiDocumentProposalDecisionRequest =
  z.infer<typeof projectAiDocumentProposalDecisionRequestSchema>
export type ProjectAiConnectionUpsertRequest = z.infer<typeof projectAiConnectionUpsertRequestSchema>
export type ProjectAiConnectionTestResponse = z.infer<typeof projectAiConnectionTestResponseSchema>
export type ProjectAiConnectionDisconnectResponse = z.infer<typeof projectAiConnectionDisconnectResponseSchema>
export type ProjectAssistantTurnRequest = z.infer<typeof projectAssistantTurnRequestSchema>
export type ProjectAssistantCitation = z.infer<typeof projectAssistantCitationSchema>
export type ProjectAssistantTurnResponse = z.infer<typeof projectAssistantTurnResponseSchema>
export type ProjectAssistantStreamEvent = z.infer<typeof projectAssistantStreamEventSchema>
export type ProjectAiConversation = z.infer<typeof projectAiConversationSchema>
export type ProjectAiConversationMessage = z.infer<typeof projectAiConversationMessageSchema>
export type ProjectAiConversationListQuery = z.infer<typeof projectAiConversationListQuerySchema>
export type ProjectAiConversationListResponse = z.infer<typeof projectAiConversationListResponseSchema>
export type ProjectAiConversationMessagesResponse = z.infer<typeof projectAiConversationMessagesResponseSchema>
