import { describe, expect, it, vi } from 'vitest'
import { AI_CONNECTION_STATUS, AI_PROVIDER, AI_TURN_OUTCOME } from '../../../shared/ai-assistant/constants'
import {
  ASSISTANT_TURN_ERROR,
  createProjectAssistantTurnService,
} from '../../../server/modules/ai-assistant/assistant-turn'

const projectId = '00000000-0000-4000-8000-000000000101'
const actorUserId = '00000000-0000-4000-8000-000000000102'
const documentId = '00000000-0000-4000-8000-000000000103'

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
  systemInstructions: 'Отвечай кратко.',
  maxOutputTokens: 512,
  requestTimeoutMs: 30_000,
  lastValidatedAt: new Date('2026-07-28T12:00:00.000Z'),
  createdAt: new Date('2026-07-28T12:00:00.000Z'),
  updatedAt: new Date('2026-07-28T12:00:00.000Z'),
}

const searchResult = {
  id: documentId,
  title: 'Авторизация',
  excerpt: 'Все запросы проверяют актуальные права пользователя.',
  updatedAt: '2026-07-28T12:00:00.000Z',
  publicationState: 'published' as const,
}

const createDependencies = () => ({
  authorize: vi.fn().mockResolvedValue({ allowed: true as const }),
  loadConnection: vi.fn().mockResolvedValue(connection),
  decryptApiKey: vi.fn().mockReturnValue('sk-private'),
  searchDocuments: vi.fn().mockResolvedValue([searchResult]),
  generate: vi.fn().mockResolvedValue({
    ok: true as const,
    answer: 'Доступ проверяется на каждом запросе.',
    citedDocumentIds: [documentId],
    usage: { inputTokens: 120, outputTokens: 18 },
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
})

describe('project assistant turn service', () => {
  it('fails closed before loading a provider connection without project.ai.use', async () => {
    const dependencies = createDependencies()
    dependencies.authorize.mockResolvedValue({ allowed: false, code: 'PERMISSION_DENIED' })
    const service = createProjectAssistantTurnService(dependencies)

    await expect(service.answer({
      projectId,
      actorUserId,
      question: 'Как работает авторизация?',
    })).resolves.toEqual({ ok: false, code: ASSISTANT_TURN_ERROR.PERMISSION_DENIED })

    expect(dependencies.loadConnection).not.toHaveBeenCalled()
    expect(dependencies.searchDocuments).not.toHaveBeenCalled()
    expect(dependencies.generate).not.toHaveBeenCalled()
  })

  it('closes project and user context over search and returns only verified citations', async () => {
    const dependencies = createDependencies()
    dependencies.generate.mockResolvedValue({
      ok: true,
      answer: 'Ответ с одной корректной ссылкой.',
      citedDocumentIds: [
        documentId,
        '00000000-0000-4000-8000-000000000999',
        documentId,
      ],
      usage: { inputTokens: 120, outputTokens: 18 },
    })
    const service = createProjectAssistantTurnService(dependencies)

    const result = await service.answer({
      projectId,
      actorUserId,
      question: '  Как работает авторизация?  ',
    })

    expect(dependencies.searchDocuments).toHaveBeenCalledWith(
      projectId,
      actorUserId,
      'Как работает авторизация?',
    )
    expect(dependencies.generate).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'sk-private',
      model: connection.model,
      question: 'Как работает авторизация?',
      documents: [expect.objectContaining({
        id: documentId,
        title: searchResult.title,
        excerpt: searchResult.excerpt,
      })],
    }))
    expect(result).toEqual({
      ok: true,
      value: {
        answer: 'Ответ с одной корректной ссылкой.',
        citations: [{ documentId, title: searchResult.title }],
        usage: { inputTokens: 120, outputTokens: 18 },
      },
    })
    expect(JSON.stringify(result)).not.toContain('sk-private')
  })

  it('rechecks permission after provider work and discards the answer when access changed', async () => {
    const dependencies = createDependencies()
    dependencies.authorize
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false, code: 'PERMISSION_DENIED' })
    const service = createProjectAssistantTurnService(dependencies)

    await expect(service.answer({
      projectId,
      actorUserId,
      question: 'Как работает авторизация?',
    })).resolves.toEqual({ ok: false, code: ASSISTANT_TURN_ERROR.PERMISSION_DENIED })

    expect(dependencies.authorize).toHaveBeenCalledTimes(2)
  })

  it('rejects an answer that cites no retrieved document when context was available', async () => {
    const dependencies = createDependencies()
    dependencies.generate.mockResolvedValue({
      ok: true,
      answer: 'Непроверенный ответ.',
      citedDocumentIds: ['00000000-0000-4000-8000-000000000999'],
      usage: { inputTokens: 120, outputTokens: 18 },
    })
    const service = createProjectAssistantTurnService(dependencies)

    await expect(service.answer({
      projectId,
      actorUserId,
      question: 'Как работает авторизация?',
    })).resolves.toEqual({ ok: false, code: ASSISTANT_TURN_ERROR.INVALID_RESPONSE })
  })

  it('does not call the provider when the connection is disabled or unvalidated', async () => {
    const dependencies = createDependencies()
    dependencies.loadConnection.mockResolvedValue({
      ...connection,
      enabled: false,
      status: AI_CONNECTION_STATUS.UNVERIFIED,
    })
    const service = createProjectAssistantTurnService(dependencies)

    await expect(service.answer({
      projectId,
      actorUserId,
      question: 'Как работает авторизация?',
    })).resolves.toEqual({ ok: false, code: ASSISTANT_TURN_ERROR.CONNECTION_UNAVAILABLE })

    expect(dependencies.decryptApiKey).not.toHaveBeenCalled()
    expect(dependencies.generate).not.toHaveBeenCalled()
  })

  it('rejects admission before decrypting or searching and does not consume provider work', async () => {
    const dependencies = createDependencies()
    dependencies.lifecycle.begin.mockResolvedValue({
      ok: false,
      code: ASSISTANT_TURN_ERROR.RATE_LIMITED,
      retryAfterMs: 1_000,
    })

    await expect(createProjectAssistantTurnService(dependencies).answer({
      projectId,
      actorUserId,
      question: 'Allowed question',
    })).resolves.toEqual({ ok: false, code: ASSISTANT_TURN_ERROR.RATE_LIMITED })
    expect(dependencies.decryptApiKey).not.toHaveBeenCalled()
    expect(dependencies.searchDocuments).not.toHaveBeenCalled()
    expect(dependencies.generate).not.toHaveBeenCalled()
  })

  it('finishes an admitted turn with bounded provider usage', async () => {
    const dependencies = createDependencies()

    await createProjectAssistantTurnService(dependencies).answer({
      projectId,
      actorUserId,
      question: 'Allowed question',
    })

    expect(dependencies.lifecycle.finish).toHaveBeenCalledWith(
      expect.any(Object),
      {
        outcome: AI_TURN_OUTCOME.COMPLETED,
        usage: { inputTokens: 120, outputTokens: 18 },
        errorCode: null,
      },
    )
  })
})
