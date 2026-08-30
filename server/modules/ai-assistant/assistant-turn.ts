import {
  AI_CONNECTION_STATUS,
  AI_QUESTION_MAX_LENGTH,
  AI_TURN_OUTCOME,
} from '../../../shared/ai-assistant/constants'
import type {
  ProjectAssistantCitation,
  ProjectAssistantTurnResponse,
} from '../../../shared/ai-assistant/contracts'
import { PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { DocumentSearchResponse } from '../../../shared/documents/contracts'
import type {
  ProjectAssistantAccessDecision,
  ProjectAssistantAuthorizationInput,
} from './authorize-project-assistant'
import type {
  AssistantProviderTool,
  ExecuteAssistantTool,
  GenerateAssistantAnswer,
} from './assistant-provider'
import type { StoredProjectAiConnection } from './project-ai-connections'
import type { createAssistantTurnLifecycle } from './assistant-turn-lifecycle'

export const ASSISTANT_TURN_ERROR = {
  INVALID_INPUT: 'INVALID_INPUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CONNECTION_UNAVAILABLE: 'CONNECTION_UNAVAILABLE',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  CANCELLED: 'CANCELLED',
  TURN_IN_PROGRESS: 'TURN_IN_PROGRESS',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

type AssistantTurnError =
  typeof ASSISTANT_TURN_ERROR[keyof typeof ASSISTANT_TURN_ERROR]

type AssistantTurnResult =
  | { readonly ok: true, readonly value: ProjectAssistantTurnResponse }
  | { readonly ok: false, readonly code: AssistantTurnError }

interface AssistantTurnInput {
  readonly projectId: string
  readonly actorUserId: string
  readonly question: string
  readonly signal?: AbortSignal
}

interface AssistantTurnDependencies {
  readonly authorize: (
    input: ProjectAssistantAuthorizationInput,
  ) => Promise<ProjectAssistantAccessDecision>
  readonly loadConnection: (projectId: string) => Promise<StoredProjectAiConnection | null>
  readonly decryptApiKey: (connection: StoredProjectAiConnection) => string
  readonly searchDocuments: (
    projectId: string,
    actorUserId: string,
    query: string,
  ) => Promise<DocumentSearchResponse | null>
  readonly generate: GenerateAssistantAnswer
  readonly lifecycle: ReturnType<typeof createAssistantTurnLifecycle>
  readonly tools?: readonly AssistantProviderTool[]
  readonly createToolExecutor?: (projectId: string, actorUserId: string) => ExecuteAssistantTool
}

const MAX_CONTEXT_DOCUMENTS = 8

const authorizeUse = (
  authorize: AssistantTurnDependencies['authorize'],
  input: AssistantTurnInput,
) => authorize({
  projectId: input.projectId,
  userId: input.actorUserId,
  permission: PROJECT_PERMISSION.PROJECT_AI_USE,
})

const mapCitations = (
  results: DocumentSearchResponse,
  citedDocumentIds: readonly string[],
): readonly ProjectAssistantCitation[] => {
  const resultById = new Map(results.map(result => [result.id, result]))
  const uniqueIds = [...new Set(citedDocumentIds)]
  return uniqueIds.flatMap((documentId): readonly ProjectAssistantCitation[] => {
    const result = resultById.get(documentId)
    return result === undefined ? [] : [{ documentId, title: result.title }]
  })
}

export const createProjectAssistantTurnService = (
  dependencies: AssistantTurnDependencies,
) => Object.freeze({
  async answer(input: AssistantTurnInput): Promise<AssistantTurnResult> {
    const question = input.question.trim()
    if (question.length === 0 || question.length > AI_QUESTION_MAX_LENGTH) {
      return { ok: false, code: ASSISTANT_TURN_ERROR.INVALID_INPUT }
    }

    const initialAccess = await authorizeUse(dependencies.authorize, input)
    if (!initialAccess.allowed) {
      return { ok: false, code: ASSISTANT_TURN_ERROR.PERMISSION_DENIED }
    }

    const connection = await dependencies.loadConnection(input.projectId)
    if (
      connection === null
      || !connection.enabled
      || connection.status !== AI_CONNECTION_STATUS.VALID
    ) {
      return { ok: false, code: ASSISTANT_TURN_ERROR.CONNECTION_UNAVAILABLE }
    }

    const admission = await dependencies.lifecycle.begin({
      projectId: input.projectId,
      actorUserId: input.actorUserId,
      connectionId: connection.id,
      provider: connection.provider,
      model: connection.model,
      requestTimeoutMs: connection.requestTimeoutMs,
    })
    if (!admission.ok) {
      return { ok: false, code: admission.code }
    }
    const lifecycleContext = admission.value

    const fail = async (
      code: AssistantTurnError,
      outcome: typeof AI_TURN_OUTCOME[keyof typeof AI_TURN_OUTCOME] = AI_TURN_OUTCOME.FAILED,
    ): Promise<AssistantTurnResult> => {
      await dependencies.lifecycle.finish(lifecycleContext, {
        outcome,
        errorCode: code,
      })
      return { ok: false, code }
    }

    let apiKey: string
    try {
      apiKey = dependencies.decryptApiKey(connection)
    }
    catch {
      return fail(ASSISTANT_TURN_ERROR.CONNECTION_UNAVAILABLE)
    }

    const searchResults = await dependencies.searchDocuments(
      input.projectId,
      input.actorUserId,
      question,
    )
    if (searchResults === null) {
      return fail(ASSISTANT_TURN_ERROR.PERMISSION_DENIED, AI_TURN_OUTCOME.DENIED)
    }
    const context = searchResults.slice(0, MAX_CONTEXT_DOCUMENTS)
    const executeTool = dependencies.createToolExecutor?.(input.projectId, input.actorUserId)
    const generated = await dependencies.generate({
      provider: connection.provider,
      apiKey,
      model: connection.model,
      question,
      systemInstructions: connection.systemInstructions,
      maxOutputTokens: connection.maxOutputTokens,
      timeoutMs: connection.requestTimeoutMs,
      documents: context.map(result => ({
        id: result.id,
        title: result.title,
        excerpt: result.excerpt,
      })),
      ...(dependencies.tools === undefined || executeTool === undefined
        ? {}
        : { tools: dependencies.tools, executeTool }),
      signal: input.signal,
    })
    if (!generated.ok) {
      return fail(
        generated.code,
        generated.code === ASSISTANT_TURN_ERROR.CANCELLED
          ? AI_TURN_OUTCOME.CANCELLED
          : generated.code === ASSISTANT_TURN_ERROR.PERMISSION_DENIED
            ? AI_TURN_OUTCOME.DENIED
            : AI_TURN_OUTCOME.FAILED,
      )
    }

    const finalAccess = await authorizeUse(dependencies.authorize, input)
    if (!finalAccess.allowed) {
      return fail(ASSISTANT_TURN_ERROR.PERMISSION_DENIED, AI_TURN_OUTCOME.DENIED)
    }
    const citationSources = [
      ...context,
      ...(generated.activity?.documents ?? []).map(document => ({
        ...document,
        excerpt: '',
        updatedAt: '',
        publicationState: 'published' as const,
      })),
    ]
    const citations = mapCitations(citationSources, generated.citedDocumentIds)
    if (context.length > 0 && citations.length === 0) {
      return fail(ASSISTANT_TURN_ERROR.INVALID_RESPONSE)
    }

    await dependencies.lifecycle.finish(lifecycleContext, {
      outcome: AI_TURN_OUTCOME.COMPLETED,
      usage: generated.usage,
      ...(generated.activity === undefined ? {} : { activity: generated.activity }),
      errorCode: null,
    })

    return {
      ok: true,
      value: {
        answer: generated.answer,
        citations,
        usage: generated.usage,
      },
    }
  },
})
