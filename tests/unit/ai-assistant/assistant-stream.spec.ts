import { describe, expect, it, vi } from 'vitest'
import { AI_CONNECTION_STATUS, AI_PROVIDER, AI_TURN_OUTCOME } from '../../../shared/ai-assistant/constants'
import {
  ASSISTANT_TURN_ERROR,
  createProjectAssistantStreamService,
} from '../../../server/modules/ai-assistant/assistant-stream'

const projectId = '00000000-0000-4000-8000-000000000101'
const actorUserId = '00000000-0000-4000-8000-000000000102'
const documentId = '00000000-0000-4000-8000-000000000103'
const conversationId = '00000000-0000-4000-8000-000000000107'

const connection = {
  id: '00000000-0000-4000-8000-000000000104',
  projectId,
  provider: AI_PROVIDER.OPENAI,
  model: 'gpt-5-mini',
  apiKeyCiphertext: 'ciphertext',
  apiKeyNonce: 'nonce',
  apiKeyKeyVersion: 1,
  enabled: true,
  status: AI_CONNECTION_STATUS.VALID,
  systemInstructions: null,
  maxOutputTokens: 512,
  requestTimeoutMs: 30_000,
  lastValidatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

async function* providerEvents() {
  yield { type: 'delta' as const, delta: 'Права ' }
  yield { type: 'delta' as const, delta: 'проверяются.' }
  yield {
    type: 'completed' as const,
    usage: { inputTokens: 80, outputTokens: 11 },
  }
}

const createDependencies = () => ({
  authorize: vi.fn().mockResolvedValue({ allowed: true as const }),
  loadConnection: vi.fn().mockResolvedValue(connection),
  decryptApiKey: vi.fn().mockReturnValue('sk-private'),
  searchDocuments: vi.fn().mockResolvedValue([{
    id: documentId,
    title: 'Авторизация',
    excerpt: 'Все запросы проверяют права пользователя.',
    updatedAt: '2026-07-28T12:00:00.000Z',
    publicationState: 'published' as const,
  }]),
  streamAnswer: vi.fn().mockResolvedValue({
    ok: true as const,
    events: providerEvents(),
  }),
  lifecycle: {
    begin: vi.fn().mockResolvedValue({
      ok: true as const,
      value: {
        projectId,
        actorUserId,
        connectionId: connection.id,
        provider: connection.provider,
        model: connection.model,
        requestTimeoutMs: connection.requestTimeoutMs,
        requestId: '00000000-0000-4000-8000-000000000105',
        leaseToken: '00000000-0000-4000-8000-000000000106',
        startedAt: new Date(),
      },
    }),
    finish: vi.fn().mockResolvedValue(undefined),
  },
  appendConversationMessage: vi.fn().mockResolvedValue({ ok: true as const, value: true as const }),
})

const collect = async <Value>(iterable: AsyncIterable<Value>): Promise<readonly Value[]> => {
  const values: Value[] = []
  for await (const value of iterable) {
    values.push(value)
  }
  return values
}

describe('project assistant streaming service', () => {
  it('emits verified context before provider deltas and a bounded completion', async () => {
    const dependencies = createDependencies()
    const service = createProjectAssistantStreamService(dependencies)

    const result = await service.stream({
      projectId,
      actorUserId,
      question: '  Как работает авторизация?  ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    await expect(collect(result.events)).resolves.toEqual([
      {
        type: 'context',
        citations: [{ documentId, title: 'Авторизация' }],
      },
      { type: 'delta', delta: 'Права ' },
      { type: 'delta', delta: 'проверяются.' },
      {
        type: 'completed',
        citations: [{ documentId, title: 'Авторизация' }],
        usage: { inputTokens: 80, outputTokens: 11 },
      },
    ])
    expect(dependencies.searchDocuments).toHaveBeenCalledWith(
      projectId,
      actorUserId,
      'Как работает авторизация?',
    )
    expect(JSON.stringify(await collectResult(service, projectId, actorUserId))).not.toContain('sk-private')
  })

  it('fails before provider access when project.ai.use is absent', async () => {
    const dependencies = createDependencies()
    dependencies.authorize.mockResolvedValue({ allowed: false, code: 'PERMISSION_DENIED' })
    const result = await createProjectAssistantStreamService(dependencies).stream({
      projectId,
      actorUserId,
      question: 'Как работает авторизация?',
    })

    expect(result).toEqual({ ok: false, code: ASSISTANT_TURN_ERROR.PERMISSION_DENIED })
    expect(dependencies.loadConnection).not.toHaveBeenCalled()
    expect(dependencies.streamAnswer).not.toHaveBeenCalled()
  })

  it('stops before the next text chunk when authorization changes during a turn', async () => {
    const dependencies = createDependencies()
    dependencies.authorize
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false, code: 'PERMISSION_DENIED' })
    const result = await createProjectAssistantStreamService(dependencies).stream({
      projectId,
      actorUserId,
      question: 'Как работает авторизация?',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    await expect(collect(result.events)).resolves.toEqual([
      {
        type: 'context',
        citations: [{ documentId, title: 'Авторизация' }],
      },
      { type: 'delta', delta: 'Права ' },
      { type: 'error', code: ASSISTANT_TURN_ERROR.PERMISSION_DENIED },
    ])
    expect(dependencies.lifecycle.finish).toHaveBeenCalledWith(
      expect.any(Object),
      {
        outcome: AI_TURN_OUTCOME.DENIED,
        errorCode: ASSISTANT_TURN_ERROR.PERMISSION_DENIED,
      },
    )
  })

  it('rejects admission before decrypting, searching, or opening a provider stream', async () => {
    const dependencies = createDependencies()
    dependencies.lifecycle.begin.mockResolvedValue({
      ok: false,
      code: ASSISTANT_TURN_ERROR.TURN_IN_PROGRESS,
      retryAfterMs: 1_000,
    })

    await expect(createProjectAssistantStreamService(dependencies).stream({
      projectId,
      actorUserId,
      question: 'Allowed question',
    })).resolves.toEqual({ ok: false, code: ASSISTANT_TURN_ERROR.TURN_IN_PROGRESS })
    expect(dependencies.decryptApiKey).not.toHaveBeenCalled()
    expect(dependencies.searchDocuments).not.toHaveBeenCalled()
    expect(dependencies.streamAnswer).not.toHaveBeenCalled()
  })

  it('releases an admitted stream with bounded usage on completion', async () => {
    const dependencies = createDependencies()
    const result = await createProjectAssistantStreamService(dependencies).stream({
      projectId,
      actorUserId,
      question: 'Allowed question',
    })
    if (!result.ok) throw new Error('Expected stream')

    await collect(result.events)

    expect(dependencies.lifecycle.finish).toHaveBeenCalledWith(
      expect.any(Object),
      {
        outcome: AI_TURN_OUTCOME.COMPLETED,
        usage: { inputTokens: 80, outputTokens: 11 },
        errorCode: null,
      },
    )
  })

  it('persists only the visible question, answer, and final citations for a selected conversation', async () => {
    const dependencies = createDependencies()
    const result = await createProjectAssistantStreamService(dependencies).stream({
      projectId,
      actorUserId,
      conversationId,
      question: '  Visible question  ',
    })
    if (!result.ok) throw new Error('Expected stream')

    await collect(result.events)

    expect(dependencies.appendConversationMessage).toHaveBeenNthCalledWith(1, {
      projectId,
      actorUserId,
      conversationId,
      requestId: '00000000-0000-4000-8000-000000000105',
      role: 'user',
      content: 'Visible question',
      citations: [],
    })
    expect(dependencies.appendConversationMessage).toHaveBeenNthCalledWith(2, {
      projectId,
      actorUserId,
      conversationId,
      requestId: '00000000-0000-4000-8000-000000000105',
      role: 'assistant',
      content: 'Права проверяются.',
      citations: [{ documentId, title: 'Авторизация' }],
    })
  })

  it('releases the lease as cancelled when the consumer closes the stream early', async () => {
    const dependencies = createDependencies()
    const result = await createProjectAssistantStreamService(dependencies).stream({
      projectId,
      actorUserId,
      question: 'Allowed question',
    })
    if (!result.ok) throw new Error('Expected stream')
    const iterator = result.events[Symbol.asyncIterator]()

    await iterator.next()
    await iterator.return?.()

    expect(dependencies.lifecycle.finish).toHaveBeenCalledWith(
      expect.any(Object),
      {
        outcome: AI_TURN_OUTCOME.CANCELLED,
        errorCode: ASSISTANT_TURN_ERROR.CANCELLED,
      },
    )
  })
})

const collectResult = async (
  service: ReturnType<typeof createProjectAssistantStreamService>,
  targetProjectId: string,
  userId: string,
) => {
  const result = await service.stream({
    projectId: targetProjectId,
    actorUserId: userId,
    question: 'Как работает авторизация?',
  })
  return result.ok ? collect(result.events) : result
}
