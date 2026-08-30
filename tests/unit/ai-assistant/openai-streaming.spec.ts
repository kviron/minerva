import { describe, expect, it, vi } from 'vitest'
import { AI_PROVIDER } from '../../../shared/ai-assistant/constants'
import { createOpenAiResponsesStreamingAdapter } from '../../../server/modules/ai-assistant/openai-responses-streaming'
import { assistantDocumentToolDefinitions } from '../../../server/modules/ai-assistant/assistant-document-tools'

const input = {
  provider: AI_PROVIDER.OPENAI,
  apiKey: 'sk-private',
  model: 'gpt-5-mini',
  question: 'Как работает авторизация?',
  systemInstructions: 'Отвечай по-русски.',
  maxOutputTokens: 512,
  timeoutMs: 30_000,
  documents: [{
    id: '00000000-0000-4000-8000-000000000103',
    title: 'Авторизация',
    excerpt: 'Все запросы проверяют права пользователя.',
  }],
}

const streamFromChunks = (chunks: readonly string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

const collect = async <Value>(iterable: AsyncIterable<Value>): Promise<readonly Value[]> => {
  const values: Value[] = []
  for await (const value of iterable) {
    values.push(value)
  }
  return values
}

describe('OpenAI Responses streaming adapter', () => {
  it('parses SSE events across chunk boundaries and exposes only text deltas and usage', async () => {
    const body = streamFromChunks([
      'event: response.output_text.delta\r\ndata: {"type":"response.output_text.delta","delta":"Права "}\r\n\r\n',
      'data: {"type":"response.output_',
      'text.delta","delta":"проверяются."}\n\n',
      'data: {"type":"response.completed","response":{"usage":{"input_tokens":80,"output_tokens":11}}}\n\n',
    ])
    const request = vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
    }))
    const adapter = createOpenAiResponsesStreamingAdapter(request)

    const result = await adapter(input)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    await expect(collect(result.events)).resolves.toEqual([
      { type: 'delta', delta: 'Права ' },
      { type: 'delta', delta: 'проверяются.' },
      {
        type: 'completed',
        usage: { inputTokens: 80, outputTokens: 11 },
      },
    ])

    const requestBody = JSON.parse(String(request.mock.calls[0]?.[1]?.body))
    expect(requestBody).toMatchObject({
      stream: true,
      store: false,
      max_output_tokens: input.maxOutputTokens,
      text: { format: { type: 'text' } },
    })
    expect(requestBody.input).toContain(input.documents[0]?.excerpt)
    expect(requestBody.input).not.toContain(input.apiKey)
  })

  it('turns malformed or incomplete streams into a content-free terminal event', async () => {
    const body = streamFromChunks([
      'data: {"type":"response.output_text.delta","delta":"private document text"}\n\n',
      'data: not-json\n\n',
    ])
    const request = vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }))
    const result = await createOpenAiResponsesStreamingAdapter(request)(input)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const events = await collect(result.events)
    expect(events.at(-1)).toEqual({ type: 'failed', code: 'INVALID_RESPONSE' })
    expect(JSON.stringify(events.at(-1))).not.toContain('private')
  })

  it('bounds an unterminated provider event instead of buffering it indefinitely', async () => {
    const body = streamFromChunks([`data: ${'x'.repeat(70 * 1024)}`])
    const request = vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }))
    const result = await createOpenAiResponsesStreamingAdapter(request)(input)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    await expect(collect(result.events)).resolves.toEqual([
      { type: 'failed', code: 'INVALID_RESPONSE' },
    ])
  })

  it('cancels provider reading when the caller aborts', async () => {
    const controller = new AbortController()
    controller.abort()
    const request = vi.fn().mockRejectedValue(new DOMException('private payload', 'AbortError'))

    const result = await createOpenAiResponsesStreamingAdapter(request)({
      ...input,
      signal: controller.signal,
    })

    expect(result).toEqual({ ok: false, code: 'CANCELLED' })
  })

  it('continues a bounded tool round before streaming the final answer', async () => {
    const documentId = input.documents[0]?.id ?? ''
    const firstBody = streamFromChunks([
      `data: ${JSON.stringify({
        type: 'response.completed',
        response: {
          output: [{
            type: 'function_call',
            id: 'fc_1',
            call_id: 'call_1',
            name: 'read_document',
            arguments: JSON.stringify({ documentId }),
          }],
          usage: { input_tokens: 20, output_tokens: 4 },
        },
      })}\n\n`,
    ])
    const secondBody = streamFromChunks([
      `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'Готовый ответ.' })}\n\n`,
      `data: ${JSON.stringify({
        type: 'response.completed',
        response: {
          output: [{
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Готовый ответ.' }],
          }],
          usage: { input_tokens: 40, output_tokens: 8 },
        },
      })}\n\n`,
    ])
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(firstBody, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }))
      .mockResolvedValueOnce(new Response(secondBody, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }))
    const executeTool = vi.fn().mockResolvedValue({
      ok: true,
      toolName: 'read_document',
      documentIds: [documentId],
      documents: [{ id: documentId, title: 'Авторизация' }],
      output: '{"type":"untrusted_document_data","data":{"text":"rules"}}',
    })

    const result = await createOpenAiResponsesStreamingAdapter(request)({
      ...input,
      tools: assistantDocumentToolDefinitions,
      executeTool,
    })
    if (!result.ok) throw new Error('Expected stream')

    await expect(collect(result.events)).resolves.toEqual([
      { type: 'delta', delta: 'Готовый ответ.' },
      {
        type: 'completed',
        usage: { inputTokens: 60, outputTokens: 12 },
        activity: {
          toolNames: ['read_document'],
          documentIds: [documentId],
          documents: [{ id: documentId, title: 'Авторизация' }],
        },
      },
    ])
    expect(executeTool).toHaveBeenCalledOnce()
    const continuation = JSON.parse(String(request.mock.calls[1]?.[1]?.body))
    expect(continuation.input).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'function_call', call_id: 'call_1' }),
      expect.objectContaining({ type: 'function_call_output', call_id: 'call_1' }),
    ]))
    expect(continuation.parallel_tool_calls).toBe(false)
  })
})
