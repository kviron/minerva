import { randomUUID } from 'node:crypto'
import {
  AI_TURN_LEASE_GRACE_MS,
  AI_TURN_OUTCOME,
  AI_PROVIDER,
  AI_TURN_RATE_MAX_REQUESTS,
  AI_TURN_RATE_WINDOW_SECONDS,
} from '../../../shared/ai-assistant/constants'

export { AI_TURN_OUTCOME } from '../../../shared/ai-assistant/constants'

export const AI_TURN_ADMISSION_CODE = {
  TURN_IN_PROGRESS: 'TURN_IN_PROGRESS',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

type AiTurnOutcome = typeof AI_TURN_OUTCOME[keyof typeof AI_TURN_OUTCOME]
type AiProvider = typeof AI_PROVIDER[keyof typeof AI_PROVIDER]

export interface AssistantTurnBeginCommand {
  readonly projectId: string
  readonly actorUserId: string
  readonly requestId: string
  readonly leaseToken: string
  readonly startedAt: Date
  readonly leaseExpiresAt: Date
  readonly maxRequests: number
  readonly rateWindowSeconds: number
}

export type AssistantTurnPersistenceBegin =
  | { readonly type: 'acquired' }
  | { readonly type: 'concurrent', readonly retryAfterMs: number }
  | { readonly type: 'rate_limited', readonly retryAfterMs: number }

export interface AssistantTurnFinishCommand {
  readonly projectId: string
  readonly actorUserId: string
  readonly connectionId: string
  readonly provider: AiProvider
  readonly model: string
  readonly requestId: string
  readonly leaseToken: string
  readonly durationMs: number
  readonly inputTokens: number | null
  readonly outputTokens: number | null
  readonly outcome: AiTurnOutcome
  readonly errorCode: string | null
  readonly toolNames: readonly string[]
  readonly documentIds: readonly string[]
  readonly finishedAt: Date
}

interface AssistantTurnLifecycleDependencies {
  readonly begin: (command: AssistantTurnBeginCommand) => Promise<AssistantTurnPersistenceBegin>
  readonly finish: (command: AssistantTurnFinishCommand) => Promise<void>
  readonly now?: () => Date
  readonly createId?: () => string
}

interface AssistantTurnLifecycleInput {
  readonly projectId: string
  readonly actorUserId: string
  readonly connectionId: string
  readonly provider: AiProvider
  readonly model: string
  readonly requestTimeoutMs: number
}

export interface AssistantTurnLifecycleContext extends AssistantTurnLifecycleInput {
  readonly requestId: string
  readonly leaseToken: string
  readonly startedAt: Date
}

interface AssistantTurnFinishInput {
  readonly outcome: AiTurnOutcome
  readonly usage?: Readonly<{
    inputTokens?: number | null
    outputTokens?: number | null
  }>
  readonly errorCode: string | null
  readonly activity?: Readonly<{
    toolNames: readonly string[]
    documentIds: readonly string[]
  }>
}

export const createAssistantTurnLifecycle = (
  dependencies: AssistantTurnLifecycleDependencies,
) => {
  const now = dependencies.now ?? (() => new Date())
  const createId = dependencies.createId ?? randomUUID

  return Object.freeze({
    async begin(input: AssistantTurnLifecycleInput) {
      const startedAt = now()
      const requestId = createId()
      const leaseToken = createId()
      const admission = await dependencies.begin({
        projectId: input.projectId,
        actorUserId: input.actorUserId,
        requestId,
        leaseToken,
        startedAt,
        leaseExpiresAt: new Date(startedAt.getTime() + input.requestTimeoutMs + AI_TURN_LEASE_GRACE_MS),
        maxRequests: AI_TURN_RATE_MAX_REQUESTS,
        rateWindowSeconds: AI_TURN_RATE_WINDOW_SECONDS,
      })
      if (admission.type !== 'acquired') {
        return {
          ok: false as const,
          code: admission.type === 'concurrent'
            ? AI_TURN_ADMISSION_CODE.TURN_IN_PROGRESS
            : AI_TURN_ADMISSION_CODE.RATE_LIMITED,
          retryAfterMs: admission.retryAfterMs,
        }
      }
      return {
        ok: true as const,
        value: { ...input, requestId, leaseToken, startedAt },
      }
    },

    async finish(context: AssistantTurnLifecycleContext, result: AssistantTurnFinishInput): Promise<void> {
      const finishedAt = now()
      await dependencies.finish({
        projectId: context.projectId,
        actorUserId: context.actorUserId,
        connectionId: context.connectionId,
        provider: context.provider,
        model: context.model,
        requestId: context.requestId,
        leaseToken: context.leaseToken,
        durationMs: Math.max(0, finishedAt.getTime() - context.startedAt.getTime()),
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        outcome: result.outcome,
        errorCode: result.errorCode,
        toolNames: result.activity?.toolNames ?? [],
        documentIds: result.activity?.documentIds ?? [],
        finishedAt,
      })
    },
  })
}
