import { z } from 'zod'
import {
  AI_ASSISTANT_ANSWER_MAX_LENGTH,
  AI_PROVIDER,
} from '../../../shared/ai-assistant/constants'
import {
  ASSISTANT_PROVIDER_ERROR,
  type AssistantProviderStreamEvent,
  type GenerateAssistantAnswerInput,
  type StreamAssistantAnswer,
} from './assistant-provider'
import { buildOpenAiInput, buildOpenAiInstructions } from './openai-prompt'

type FetchCapability = (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
) => Promise<Response>

const eventTypeSchema = z.object({ type: z.string() }).passthrough()
const deltaEventSchema = z.object({
  type: z.literal('response.output_text.delta'),
  delta: z.string().min(1),
}).passthrough()
const outputItemSchema = z.object({ type: z.string() }).passthrough()
const completedEventSchema = z.object({
  type: z.literal('response.completed'),
  response: z.object({
    output: z.array(outputItemSchema).max(32).optional(),
    usage: z.object({
      input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional(),
    }).passthrough().nullable().optional(),
  }).passthrough(),
}).passthrough()
const functionCallSchema = z.object({
  type: z.literal('function_call'),
  id: z.string().min(1).max(200),
  call_id: z.string().min(1).max(200),
  name: z.string().min(1).max(100),
  arguments: z.string().max(8_000),
}).passthrough()

const terminalFailureTypes = new Set(['error', 'response.failed', 'response.incomplete'])
const MAX_SSE_BUFFER_LENGTH = 64 * 1024
const MAX_TOOL_ROUNDS = 3

const combineSignals = (input: GenerateAssistantAnswerInput): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(input.timeoutMs)
  return input.signal === undefined ? timeoutSignal : AbortSignal.any([input.signal, timeoutSignal])
}

const extractData = (block: string): string | null => {
  const data = block.split(/\r?\n/u)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n')
  return data.length === 0 ? null : data
}

async function* readSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const drain = function* (): Generator<string> {
    while (true) {
      const boundary = /\r?\n\r?\n/u.exec(buffer)
      if (boundary === null || boundary.index === undefined) return
      const block = buffer.slice(0, boundary.index)
      buffer = buffer.slice(boundary.index + boundary[0].length)
      const data = extractData(block)
      if (data !== null) yield data
    }
  }
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) {
        buffer += decoder.decode()
        break
      }
      buffer += decoder.decode(next.value, { stream: true })
      if (buffer.length > MAX_SSE_BUFFER_LENGTH) throw new Error('Invalid provider event stream')
      yield* drain()
    }
    yield* drain()
    const tail = extractData(buffer)
    if (tail !== null) yield tail
  }
  finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

const parseEvent = (data: string): unknown => {
  try {
    return JSON.parse(data)
  }
  catch {
    return null
  }
}

type RoundEvent =
  | { readonly type: 'delta', readonly delta: string }
  | {
    readonly type: 'round_completed'
    readonly output: readonly z.infer<typeof outputItemSchema>[]
    readonly usage: Readonly<{ inputTokens: number | null, outputTokens: number | null }>
  }
  | {
    readonly type: 'failed'
    readonly code: 'PROVIDER_UNAVAILABLE' | 'INVALID_RESPONSE' | 'CANCELLED'
  }

async function* toRoundEvents(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<RoundEvent> {
  let completed = false
  let answerLength = 0
  try {
    for await (const data of readSseData(body)) {
      const raw = parseEvent(data)
      const eventType = eventTypeSchema.safeParse(raw)
      if (!eventType.success) {
        yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
        return
      }
      if (eventType.data.type === 'response.output_text.delta') {
        const delta = deltaEventSchema.safeParse(raw)
        if (!delta.success) {
          yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
          return
        }
        answerLength += delta.data.delta.length
        if (answerLength > AI_ASSISTANT_ANSWER_MAX_LENGTH) {
          yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
          return
        }
        yield { type: 'delta', delta: delta.data.delta }
        continue
      }
      if (eventType.data.type === 'response.completed') {
        const completion = completedEventSchema.safeParse(raw)
        if (!completion.success) {
          yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
          return
        }
        completed = true
        yield {
          type: 'round_completed',
          output: completion.data.response.output ?? [],
          usage: {
            inputTokens: completion.data.response.usage?.input_tokens ?? null,
            outputTokens: completion.data.response.usage?.output_tokens ?? null,
          },
        }
        return
      }
      if (terminalFailureTypes.has(eventType.data.type)) {
        yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
        return
      }
    }
    if (!completed) yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
  }
  catch {
    yield {
      type: 'failed',
      code: signal.aborted
        ? ASSISTANT_PROVIDER_ERROR.CANCELLED
        : ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE,
    }
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

const responseRequestBody = (
  input: GenerateAssistantAnswerInput,
  history: readonly unknown[],
  tools: ReturnType<typeof openAiTools>,
) => ({
  model: input.model,
  instructions: buildOpenAiInstructions(
    input,
    'Отвечай обычным текстом. Не придумывай источники: интерфейс отдельно покажет проверенные документы.',
  ),
  input: tools === undefined ? buildOpenAiInput(input) : history,
  max_output_tokens: input.maxOutputTokens,
  stream: true,
  store: false,
  text: { format: { type: 'text' } },
  ...(tools === undefined ? {} : { tools, parallel_tool_calls: false }),
})

const requestStream = async (
  request: FetchCapability,
  input: GenerateAssistantAnswerInput,
  signal: AbortSignal,
  history: readonly unknown[],
  tools: ReturnType<typeof openAiTools>,
): Promise<Response | null> => {
  const response = await request('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(responseRequestBody(input, history, tools)),
    redirect: 'error',
    signal,
  })
  return response.ok
    && response.body !== null
    && response.headers.get('content-type')?.toLowerCase().startsWith('text/event-stream')
    ? response
    : null
}

async function* runToolRounds(
  initialResponse: Response,
  request: FetchCapability,
  input: GenerateAssistantAnswerInput,
  signal: AbortSignal,
  history: unknown[],
  tools: ReturnType<typeof openAiTools>,
): AsyncGenerator<AssistantProviderStreamEvent> {
  let response = initialResponse
  let usage: Readonly<{ inputTokens: number | null, outputTokens: number | null }> = {
    inputTokens: null,
    outputTokens: null,
  }
  const toolNames = new Set<string>()
  const documentIds = new Set<string>()
  const documents = new Map<string, Readonly<{ id: string, title: string }>>()

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    if (response.body === null) {
      yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
      return
    }
    let completion: Extract<RoundEvent, { type: 'round_completed' }> | null = null
    let emittedText = false
    for await (const event of toRoundEvents(response.body, signal)) {
      if (event.type === 'failed') {
        yield event
        return
      }
      if (event.type === 'delta') {
        emittedText = true
        yield event
      }
      else completion = event
    }
    if (completion === null) {
      yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
      return
    }
    usage = addUsage(usage, completion.usage)
    const calls = completion.output.flatMap((item) => {
      const parsed = functionCallSchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    })
    if (calls.length === 0) {
      yield {
        type: 'completed',
        usage,
        ...(toolNames.size === 0 ? {} : {
          activity: {
            toolNames: [...toolNames],
            documentIds: [...documentIds],
            documents: [...documents.values()],
          },
        }),
      }
      return
    }
    if (emittedText || calls.length !== 1 || round === MAX_TOOL_ROUNDS || input.executeTool === undefined) {
      yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
      return
    }
    const call = calls[0]
    if (call === undefined) {
      yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE }
      return
    }
    const executed = await input.executeTool({ name: call.name, argumentsJson: call.arguments })
    if (!executed.ok) {
      yield {
        type: 'failed',
        code: executed.code === 'PERMISSION_DENIED'
          ? ASSISTANT_PROVIDER_ERROR.PERMISSION_DENIED
          : ASSISTANT_PROVIDER_ERROR.INVALID_RESPONSE,
      }
      return
    }
    toolNames.add(executed.toolName)
    for (const id of executed.documentIds) documentIds.add(id)
    for (const document of executed.documents ?? []) documents.set(document.id, document)
    history.push(...completion.output, {
      type: 'function_call_output',
      call_id: call.call_id,
      output: executed.output,
    })
    try {
      const next = await requestStream(request, input, signal, history, tools)
      if (next === null) {
        yield { type: 'failed', code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
        return
      }
      response = next
    }
    catch {
      yield {
        type: 'failed',
        code: signal.aborted
          ? ASSISTANT_PROVIDER_ERROR.CANCELLED
          : ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE,
      }
      return
    }
  }
}

export const createOpenAiResponsesStreamingAdapter = (
  request: FetchCapability = fetch,
): StreamAssistantAnswer => async (input) => {
  if (input.provider !== AI_PROVIDER.OPENAI) {
    return { ok: false, code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
  }
  try {
    const signal = combineSignals(input)
    const tools = openAiTools(input)
    const history: unknown[] = [{ role: 'user', content: buildOpenAiInput(input) }]
    const response = await requestStream(request, input, signal, history, tools)
    if (response === null) return { ok: false, code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
    return { ok: true, events: runToolRounds(response, request, input, signal, history, tools) }
  }
  catch {
    return input.signal?.aborted === true
      ? { ok: false, code: ASSISTANT_PROVIDER_ERROR.CANCELLED }
      : { ok: false, code: ASSISTANT_PROVIDER_ERROR.PROVIDER_UNAVAILABLE }
  }
}
