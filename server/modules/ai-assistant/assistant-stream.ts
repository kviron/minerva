import {
  AI_ASSISTANT_STREAM_ERROR,
  AI_ASSISTANT_STREAM_EVENT,
  AI_ASSISTANT_ANSWER_MAX_LENGTH,
  AI_CONNECTION_STATUS,
  AI_CONVERSATION_MESSAGE_ROLE,
  AI_QUESTION_MAX_LENGTH,
  AI_TURN_OUTCOME,
} from '../../../shared/ai-assistant/constants'
import type {
  ProjectAssistantCitation,
  ProjectAssistantStreamEvent,
} from '../../../shared/ai-assistant/contracts'
import type { DocumentSearchResponse } from '../../../shared/documents/contracts'
import { PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type {
  ProjectAssistantAccessDecision,
  ProjectAssistantAuthorizationInput,
} from './authorize-project-assistant'
import type {
  AssistantContextDocument,
  AssistantProviderTool,
  ExecuteAssistantTool,
  StreamAssistantAnswer,
} from './assistant-provider'
import type { StoredProjectAiConnection } from './project-ai-connections'
import { ASSISTANT_TURN_ERROR } from './assistant-turn'
import type { createAssistantTurnLifecycle } from './assistant-turn-lifecycle'

export { ASSISTANT_TURN_ERROR } from './assistant-turn'

type AssistantStreamResult =
  | { readonly ok: true, readonly events: AsyncIterable<ProjectAssistantStreamEvent> }
  | {
    readonly ok: false
    readonly code: typeof ASSISTANT_TURN_ERROR[keyof typeof ASSISTANT_TURN_ERROR]
  }

interface AssistantStreamInput {
  readonly projectId: string
  readonly actorUserId: string
  readonly question: string
  readonly conversationId?: string
  readonly signal?: AbortSignal
}

interface AssistantStreamDependencies {
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
  readonly streamAnswer: StreamAssistantAnswer
  readonly lifecycle: ReturnType<typeof createAssistantTurnLifecycle>
  readonly tools?: readonly AssistantProviderTool[]
  readonly createToolExecutor?: (projectId: string, actorUserId: string) => ExecuteAssistantTool
  readonly appendConversationMessage?: (input: Readonly<{
    projectId: string
    actorUserId: string
    conversationId: string
    requestId: string
    role: typeof AI_CONVERSATION_MESSAGE_ROLE[keyof typeof AI_CONVERSATION_MESSAGE_ROLE]
    content: string
    citations: readonly ProjectAssistantCitation[]
  }>) => Promise<Readonly<{ ok: boolean }>>
}

const MAX_CONTEXT_DOCUMENTS = 8

const authorizeUse = (
  authorize: AssistantStreamDependencies['authorize'],
  input: AssistantStreamInput,
) => authorize({
  projectId: input.projectId,
  userId: input.actorUserId,
  permission: PROJECT_PERMISSION.PROJECT_AI_USE,
})

const contextProjection = (
  results: DocumentSearchResponse,
): Readonly<{
  documents: readonly AssistantContextDocument[]
  citations: readonly ProjectAssistantCitation[]
}> => ({
  documents: results.map(result => ({
    id: result.id,
    title: result.title,
    excerpt: result.excerpt,
  })),
  citations: results.map(result => ({
    documentId: result.id,
    title: result.title,
  })),
})

const toPublicStreamError = (
  code: 'PROVIDER_UNAVAILABLE' | 'INVALID_RESPONSE' | 'CANCELLED',
): typeof AI_ASSISTANT_STREAM_ERROR[keyof typeof AI_ASSISTANT_STREAM_ERROR] => code

export const createProjectAssistantStreamService = (
  dependencies: AssistantStreamDependencies,
) => Object.freeze({
  async stream(input: AssistantStreamInput): Promise<AssistantStreamResult> {
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

    const finishFailure = (
      code: typeof ASSISTANT_TURN_ERROR[keyof typeof ASSISTANT_TURN_ERROR],
      outcome: typeof AI_TURN_OUTCOME[keyof typeof AI_TURN_OUTCOME] = AI_TURN_OUTCOME.FAILED,
    ) => dependencies.lifecycle.finish(lifecycleContext, { outcome, errorCode: code })

    if (input.conversationId !== undefined) {
      const saved = await dependencies.appendConversationMessage?.({
        projectId: input.projectId,
        actorUserId: input.actorUserId,
        conversationId: input.conversationId,
        requestId: lifecycleContext.requestId,
        role: AI_CONVERSATION_MESSAGE_ROLE.USER,
        content: question,
        citations: [],
      })
      if (saved?.ok !== true) {
        await finishFailure(ASSISTANT_TURN_ERROR.PERMISSION_DENIED, AI_TURN_OUTCOME.DENIED)
        return { ok: false, code: ASSISTANT_TURN_ERROR.PERMISSION_DENIED }
      }
    }

    let apiKey: string
    try {
      apiKey = dependencies.decryptApiKey(connection)
    }
    catch {
      await finishFailure(ASSISTANT_TURN_ERROR.CONNECTION_UNAVAILABLE)
      return { ok: false, code: ASSISTANT_TURN_ERROR.CONNECTION_UNAVAILABLE }
    }

    const searchResults = await dependencies.searchDocuments(
      input.projectId,
      input.actorUserId,
      question,
    )
    if (searchResults === null) {
      await finishFailure(ASSISTANT_TURN_ERROR.PERMISSION_DENIED, AI_TURN_OUTCOME.DENIED)
      return { ok: false, code: ASSISTANT_TURN_ERROR.PERMISSION_DENIED }
    }
    const context = contextProjection(searchResults.slice(0, MAX_CONTEXT_DOCUMENTS))
    const executeTool = dependencies.createToolExecutor?.(input.projectId, input.actorUserId)
    const provider = await dependencies.streamAnswer({
      provider: connection.provider,
      apiKey,
      model: connection.model,
      question,
      systemInstructions: connection.systemInstructions,
      maxOutputTokens: connection.maxOutputTokens,
      timeoutMs: connection.requestTimeoutMs,
      documents: context.documents,
      ...(dependencies.tools === undefined || executeTool === undefined
        ? {}
        : { tools: dependencies.tools, executeTool }),
      signal: input.signal,
    })
    if (!provider.ok) {
      await finishFailure(
        provider.code,
        provider.code === ASSISTANT_TURN_ERROR.CANCELLED
          ? AI_TURN_OUTCOME.CANCELLED
          : AI_TURN_OUTCOME.FAILED,
      )
      return { ok: false, code: provider.code }
    }
    const providerEvents = provider.events

    async function* events(): AsyncGenerator<ProjectAssistantStreamEvent> {
      let finished = false
      let visibleAnswer = ''
      try {
        yield {
          type: AI_ASSISTANT_STREAM_EVENT.CONTEXT,
          citations: context.citations,
        }

        for await (const providerEvent of providerEvents) {
          if (providerEvent.type === 'failed') {
            await finishFailure(
              providerEvent.code,
              providerEvent.code === ASSISTANT_TURN_ERROR.CANCELLED
                ? AI_TURN_OUTCOME.CANCELLED
                : providerEvent.code === ASSISTANT_TURN_ERROR.PERMISSION_DENIED
                  ? AI_TURN_OUTCOME.DENIED
                : AI_TURN_OUTCOME.FAILED,
            )
            finished = true
            yield {
              type: AI_ASSISTANT_STREAM_EVENT.ERROR,
              code: providerEvent.code === ASSISTANT_TURN_ERROR.PERMISSION_DENIED
                ? AI_ASSISTANT_STREAM_ERROR.PERMISSION_DENIED
                : toPublicStreamError(providerEvent.code),
            }
            return
          }

          const currentAccess = await authorizeUse(dependencies.authorize, input)
          if (!currentAccess.allowed) {
            await finishFailure(ASSISTANT_TURN_ERROR.PERMISSION_DENIED, AI_TURN_OUTCOME.DENIED)
            finished = true
            yield {
              type: AI_ASSISTANT_STREAM_EVENT.ERROR,
              code: AI_ASSISTANT_STREAM_ERROR.PERMISSION_DENIED,
            }
            return
          }

          if (providerEvent.type === 'delta') {
            visibleAnswer += providerEvent.delta
            if (visibleAnswer.length > AI_ASSISTANT_ANSWER_MAX_LENGTH) {
              await finishFailure(ASSISTANT_TURN_ERROR.INVALID_RESPONSE)
              finished = true
              yield {
                type: AI_ASSISTANT_STREAM_EVENT.ERROR,
                code: AI_ASSISTANT_STREAM_ERROR.INVALID_RESPONSE,
              }
              return
            }
            yield {
              type: AI_ASSISTANT_STREAM_EVENT.DELTA,
              delta: providerEvent.delta,
            }
            continue
          }

          const completionCitations = [
            ...(providerEvent.activity?.documents ?? []).map(document => ({
              documentId: document.id,
              title: document.title,
            })),
            ...context.citations,
          ].filter((citation, index, values) =>
            values.findIndex(value => value.documentId === citation.documentId) === index,
          ).slice(0, MAX_CONTEXT_DOCUMENTS)
          if (input.conversationId !== undefined) {
            const saved = visibleAnswer.length === 0
              ? undefined
              : await dependencies.appendConversationMessage?.({
                  projectId: input.projectId,
                  actorUserId: input.actorUserId,
                  conversationId: input.conversationId,
                  requestId: lifecycleContext.requestId,
                  role: AI_CONVERSATION_MESSAGE_ROLE.ASSISTANT,
                  content: visibleAnswer,
                  citations: completionCitations,
                })
            if (saved?.ok !== true) {
              await finishFailure(ASSISTANT_TURN_ERROR.PERMISSION_DENIED, AI_TURN_OUTCOME.DENIED)
              finished = true
              yield {
                type: AI_ASSISTANT_STREAM_EVENT.ERROR,
                code: AI_ASSISTANT_STREAM_ERROR.PERMISSION_DENIED,
              }
              return
            }
          }
          await dependencies.lifecycle.finish(lifecycleContext, {
            outcome: AI_TURN_OUTCOME.COMPLETED,
            usage: providerEvent.usage,
            ...(providerEvent.activity === undefined ? {} : { activity: providerEvent.activity }),
            errorCode: null,
          })
          finished = true
          yield {
            type: AI_ASSISTANT_STREAM_EVENT.COMPLETED,
            citations: completionCitations,
            usage: providerEvent.usage,
          }
          return
        }

        await finishFailure(ASSISTANT_TURN_ERROR.INVALID_RESPONSE)
        finished = true
        yield {
          type: AI_ASSISTANT_STREAM_EVENT.ERROR,
          code: AI_ASSISTANT_STREAM_ERROR.INVALID_RESPONSE,
        }
      }
      finally {
        if (!finished) {
          await finishFailure(ASSISTANT_TURN_ERROR.CANCELLED, AI_TURN_OUTCOME.CANCELLED)
        }
      }
    }

    return { ok: true, events: events() }
  },
})
