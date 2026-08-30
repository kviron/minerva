import { z } from 'zod'
import {
  AI_ASSISTANT_ANSWER_MAX_LENGTH,
  AI_PROVIDER,
} from '../../../shared/ai-assistant/constants'
import {
  ASSISTANT_PROVIDER_ERROR,
  type GenerateAssistantAnswer,
  type GenerateAssistantAnswerInput,
  type GenerateAssistantAnswerResult,
} from './assistant-provider'
import { buildOpenAiInput, buildOpenAiInstructions } from './openai-prompt'

type FetchCapability = (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
) => Promise<Response>

const providerAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(AI_ASSISTANT_ANSWER_MAX_LENGTH),
  citedDocumentIds: z.array(z.string().uuid()).max(8),
}).strict().readonly()

const outputTextSchema = z.object({
  type: z.literal('output_text'),
  text: z.string(),
}).passthrough()

const providerOutputItemSchema = z.object({
  type: z.string(),
}).passthrough()

const providerResponseSchema = z.object({
  status: z.literal('completed'),
  output: z.array(providerOutputItemSchema).max(32),
  usage: z.object({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
  }).passthrough().optional(),
}).passthrough()

const messageItemSchema = z.object({
  type: z.literal('message'),
  role: z.literal('assistant'),
  content: z.array(outputTextSchema),
}).passthrough()

const functionCallSchema = z.object({
  type: z.literal('function_call'),
  id: z.string().min(1).max(200),
  call_id: z.string().min(1).max(200),
  name: z.string().min(1).max(100),
  arguments: z.string().max(8_000),
}).passthrough()

const responseFormat = {
  type: 'json_schema',
  name: 'minerva_document_answer',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      answer: { type: 'string' },
      citedDocumentIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
      },
    },
    required: ['answer', 'citedDocumentIds'],
  },
}

const buildInstructions = (input: GenerateAssistantAnswerInput): string =>
  buildOpenAiInstructions(
    input,
    'Указывай в citedDocumentIds только идентификаторы документов, реально использованных в ответе.',
  )

const combineSignals = (input: GenerateAssistantAnswerInput): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(input.timeoutMs)
  return input.signal === undefined
    ? timeoutSignal
    : AbortSignal.any([input.signal, timeoutSignal])
}

type ParsedProviderResponse =
  | { readonly ok: false, readonly code: 'PROVIDER_UNAVAILABLE' | 'INVALID_RESPONSE' }
  | {
    readonly ok: true
    readonly output: readonly z.infer<typeof providerOutputItemSchema>[]
    readonly usage: Readonly<{ inputTokens: number | null, outputTokens: number | null }>
  }

const parseProviderResponse = async (response: Response): Promise<ParsedProviderResponse> => {
  if (!response.ok) {
    return { ok: false, code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
  }

  let raw: unknown
  try {
    raw = await response.json()
  }
  catch {
    return { ok: false, code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
  }

  const parsedResponse = providerResponseSchema.safeParse(raw)
  if (!parsedResponse.success) {
    return { ok: false, code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
  }
  return {
    ok: true,
    output: parsedResponse.data.output,
    usage: {
      inputTokens: parsedResponse.data.usage?.input_tokens ?? null,
      outputTokens: parsedResponse.data.usage?.output_tokens ?? null,
    },
  }
}

const parseAnswer = (
  output: readonly z.infer<typeof providerOutputItemSchema>[],
): Omit<Extract<GenerateAssistantAnswerResult, { ok: true }>, 'usage' | 'activity'> | null => {
  const messages = output.flatMap((item) => {
    const parsed = messageItemSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
  const outputText = messages.flatMap(item => item.content).find(item => item.type === 'output_text')
  if (outputText === undefined) {
    return null
  }

  let answerValue: unknown
  try {
    answerValue = JSON.parse(outputText.text)
  }
  catch {
    return null
  }
  const answer = providerAnswerSchema.safeParse(answerValue)
  if (!answer.success) {
    return null
  }

  return {
    ok: true,
    answer: answer.data.answer,
    citedDocumentIds: answer.data.citedDocumentIds,
  }
}

const openAiTools = (input: GenerateAssistantAnswerInput) => input.tools?.map(tool => ({
  type: 'function',
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters,
  strict: tool.strict,
}))

const addUsage = (
  total: Readonly<{ inputTokens: number | null, outputTokens: number | null }>,
  next: Readonly<{ inputTokens: number | null, outputTokens: number | null }>,
) => ({
  inputTokens: total.inputTokens === null && next.inputTokens === null
    ? null
    : (total.inputTokens ?? 0) + (next.inputTokens ?? 0),
  outputTokens: total.outputTokens === null && next.outputTokens === null
    ? null
    : (total.outputTokens ?? 0) + (next.outputTokens ?? 0),
})

const MAX_TOOL_ROUNDS = 3

export const createOpenAiResponsesAdapter = (
  request: FetchCapability = fetch,
): GenerateAssistantAnswer => async (input) => {
  if (input.provider !== AI_PROVIDER.OPENAI) {
    return { ok: false, code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
  }

  try {
    const signal = combineSignals(input)
    const tools = openAiTools(input)
    const history: unknown[] = [{ role: 'user', content: buildOpenAiInput(input) }]
    const toolNames = new Set<string>()
    const documentIds = new Set<string>()
    const activityDocuments = new Map<string, Readonly<{ id: string, title: string }>>()
    let usage: Readonly<{ inputTokens: number | null, outputTokens: number | null }> = {
      inputTokens: null,
      outputTokens: null,
    }

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const response = await request('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model,
          instructions: buildInstructions(input),
          input: tools === undefined ? buildOpenAiInput(input) : history,
          max_output_tokens: input.maxOutputTokens,
          store: false,
          text: { format: responseFormat },
          ...(tools === undefined ? {} : { tools, parallel_tool_calls: false }),
        }),
        redirect: 'error',
        signal,
      })
      const parsed = await parseProviderResponse(response)
      if (!parsed.ok) return parsed
      usage = addUsage(usage, parsed.usage)
      const calls = parsed.output.flatMap((item) => {
        const call = functionCallSchema.safeParse(item)
        return call.success ? [call.data] : []
      })
      if (calls.length === 0) {
        const answer = parseAnswer(parsed.output)
        if (answer === null) return { ok: false, code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
        return {
          ...answer,
          usage,
          ...(toolNames.size === 0 ? {} : {
            activity: {
              toolNames: [...toolNames],
              documentIds: [...documentIds],
              documents: [...activityDocuments.values()],
            },
          }),
        }
      }
      if (
        calls.length !== 1
        || round === MAX_TOOL_ROUNDS
        || input.executeTool === undefined
      ) {
        return { ok: false, code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
      }
      const call = calls[0]
      if (call === undefined) return { ok: false, code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
      const executed = await input.executeTool({
        name: call.name,
        argumentsJson: call.arguments,
      })
      if (!executed.ok) {
        return {
          ok: false,
          code: executed.code === 'PERMISSION_DENIED'
            ? ASSISTANT_PROVIDER_ERROR.PERMISSION_DENIED
            : ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE,
        }
      }
      toolNames.add(executed.toolName)
      for (const id of executed.documentIds) documentIds.add(id)
      for (const document of executed.documents ?? []) activityDocuments.set(document.id, document)
      history.push(...parsed.output, {
        type: 'function_call_output',
        call_id: call.call_id,
        output: executed.output,
      })
    }
    return { ok: false, code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
  }
  catch (error) {
    if (input.signal?.aborted === true) {
      return { ok: false, code: ASSISTANT_PROVIDER_ERROR.CANCELLED }
    }
    return { ok: false, code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
  }
}
