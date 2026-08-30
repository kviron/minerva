import { describe, expect, it, vi } from 'vitest'
import { createProjectAssistantTurnsApi } from '../../../../app/features/ai-assistant/api/assistant-turns-api'

const projectId = '21b9fc31-6e20-4399-a2ea-fb4de1024821'
const documentId = '31b9fc31-6e20-4399-a2ea-fb4de1024821'
const conversationId = '41b9fc31-6e20-4399-a2ea-fb4de1024821'

const streamResponse = (chunks: readonly string[], contentType = 'text/event-stream') => {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  }), {
    status: 200,
    headers: { 'content-type': contentType },
  })
}

describe('project assistant streaming client API', () => {
  it('validates SSE events across chunk boundaries without exposing transport payloads', async () => {
    const request = vi.fn().mockResolvedValue(streamResponse([
      `event: context\ndata: {"type":"context","citations":[{"documentId":"${documentId}","title":"Авторизация"}]}\n\n`,
      'event: delta\ndata: {"type":"delta","del',
      'ta":"Права проверяются."}\r\n\r\n',
      `event: completed\ndata: {"type":"completed","citations":[{"documentId":"${documentId}","title":"Авторизация"}],"usage":{"inputTokens":42,"outputTokens":7}}\n\n`,
    ]))
    const api = createProjectAssistantTurnsApi(request)
    const signal = new AbortController().signal

    const events = []
    for await (const event of api.stream(projectId, conversationId, 'Как проверяются права?', signal)) {
      events.push(event)
    }

    expect(events).toEqual([
      { type: 'context', citations: [{ documentId, title: 'Авторизация' }] },
      { type: 'delta', delta: 'Права проверяются.' },
      {
        type: 'completed',
        citations: [{ documentId, title: 'Авторизация' }],
        usage: { inputTokens: 42, outputTokens: 7 },
      },
    ])
    expect(request).toHaveBeenCalledWith(
      `/api/projects/${projectId}/ai-assistant/turn/stream`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ question: 'Как проверяются права?', conversationId }),
        signal,
      }),
    )
  })

  it('fails closed on malformed events and non-SSE responses', async () => {
    const malformed = createProjectAssistantTurnsApi(vi.fn().mockResolvedValue(streamResponse([
      'event: delta\ndata: {"type":"delta","delta":"ok","secret":"leak"}\n\n',
    ])))
    const wrongContentType = createProjectAssistantTurnsApi(vi.fn().mockResolvedValue(
      streamResponse(['private provider payload'], 'application/json'),
    ))

    await expect((async () => {
      for await (const event of malformed.stream(projectId, conversationId, 'Вопрос')) void event
    })()).rejects.toThrow('Invalid assistant stream')
    await expect((async () => {
      for await (const event of wrongContentType.stream(projectId, conversationId, 'Вопрос')) void event
    })()).rejects.toThrow('Invalid assistant stream')
  })
})
