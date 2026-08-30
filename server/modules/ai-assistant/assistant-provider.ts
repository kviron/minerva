import type { AI_PROVIDER } from '../../../shared/ai-assistant/constants'

export const ASSISTANT_PROVIDER_ERROR = {
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  CANCELLED: 'CANCELLED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const

export type AssistantProviderError =
  typeof ASSISTANT_PROVIDER_ERROR[keyof typeof ASSISTANT_PROVIDER_ERROR]

export interface AssistantContextDocument {
  readonly id: string
  readonly title: string
  readonly excerpt: string
}

export interface AssistantProviderUsage {
  readonly inputTokens: number | null
  readonly outputTokens: number | null
}

export interface AssistantProviderTool {
  readonly name: string
  readonly description: string
  readonly strict: true
  readonly readOnly: true
  readonly parameters: Readonly<{
    type: 'object'
    properties: Readonly<Record<string, unknown>>
    required: readonly string[]
    additionalProperties: false
  }>
}

export interface AssistantProviderActivity {
  readonly toolNames: readonly string[]
  readonly documentIds: readonly string[]
  readonly documents?: readonly Readonly<{ id: string, title: string }>[]
}

export type ExecuteAssistantTool = (call: Readonly<{
  name: string
  argumentsJson: string
}>) => Promise<
  | {
    readonly ok: true
    readonly toolName: string
    readonly documentIds: readonly string[]
    readonly documents?: readonly Readonly<{ id: string, title: string }>[]
    readonly output: string
  }
  | { readonly ok: false, readonly code: 'INVALID_CALL' | 'PERMISSION_DENIED' }
>

export interface GenerateAssistantAnswerInput {
  readonly provider: typeof AI_PROVIDER[keyof typeof AI_PROVIDER]
  readonly apiKey: string
  readonly model: string
  readonly question: string
  readonly systemInstructions: string | null
  readonly maxOutputTokens: number
  readonly timeoutMs: number
  readonly documents: readonly AssistantContextDocument[]
  readonly tools?: readonly AssistantProviderTool[]
  readonly executeTool?: ExecuteAssistantTool
  readonly signal?: AbortSignal
}

export type GenerateAssistantAnswerResult =
  | {
    readonly ok: true
    readonly answer: string
    readonly citedDocumentIds: readonly string[]
    readonly usage: AssistantProviderUsage
    readonly activity?: AssistantProviderActivity
  }
  | { readonly ok: false, readonly code: AssistantProviderError }

export type GenerateAssistantAnswer = (
  input: GenerateAssistantAnswerInput,
) => Promise<GenerateAssistantAnswerResult>

export type AssistantProviderStreamEvent =
  | { readonly type: 'delta', readonly delta: string }
  | {
    readonly type: 'completed'
    readonly usage: AssistantProviderUsage
    readonly activity?: AssistantProviderActivity
  }
  | { readonly type: 'failed', readonly code: AssistantProviderError }

export type StreamAssistantAnswerResult =
  | { readonly ok: true, readonly events: AsyncIterable<AssistantProviderStreamEvent> }
  | { readonly ok: false, readonly code: AssistantProviderError }

export type StreamAssistantAnswer = (
  input: GenerateAssistantAnswerInput,
) => Promise<StreamAssistantAnswerResult>
