import { describe, expect, it } from 'vitest'
import {
  projectAiAvailabilityResponseSchema,
  projectAiConnectionResponseSchema,
  projectAiConnectionUpsertRequestSchema,
  projectAssistantStreamEventSchema,
  projectAssistantTurnRequestSchema,
  projectAssistantTurnResponseSchema,
} from '../../../shared/ai-assistant/contracts'
import {
  AI_ASSISTANT_AVAILABILITY,
  AI_CONNECTION_STATUS,
  AI_PROVIDER,
} from '../../../shared/ai-assistant/constants'

const safeConnection = {
  id: '00000000-0000-4000-8000-000000000091',
  provider: AI_PROVIDER.OPENAI,
  model: 'gpt-5-mini',
  enabled: true,
  status: AI_CONNECTION_STATUS.UNVERIFIED,
  systemInstructions: null,
  maxOutputTokens: 2048,
  requestTimeoutMs: 30_000,
  lastValidatedAt: null,
  createdAt: '2026-07-16T12:00:00.000Z',
  updatedAt: '2026-07-16T12:00:00.000Z',
}

describe('project AI connection contracts', () => {
  it('exposes only the closed assistant availability state', () => {
    expect(projectAiAvailabilityResponseSchema.parse({
      availability: AI_ASSISTANT_AVAILABILITY.NOT_CONFIGURED,
    })).toEqual({ availability: AI_ASSISTANT_AVAILABILITY.NOT_CONFIGURED })
    expect(() => projectAiAvailabilityResponseSchema.parse({
      availability: 'ready',
      apiKey: 'secret',
    })).toThrow()
  })

  it('accepts a strict safe projection and rejects encryption material', () => {
    expect(projectAiConnectionResponseSchema.parse({ connection: safeConnection }))
      .toEqual({ connection: safeConnection })
    expect(() => projectAiConnectionResponseSchema.parse({
      connection: { ...safeConnection, apiKeyCiphertext: 'secret' },
    })).toThrow()
  })

  it('validates bounded provider configuration and accepts the key only on writes', () => {
    expect(projectAiConnectionUpsertRequestSchema.parse({
      provider: AI_PROVIDER.OPENAI,
      model: 'gpt-5-mini',
      apiKey: 'sk-test-12345678901234567890',
      enabled: true,
      systemInstructions: 'Отвечай по-русски.',
      maxOutputTokens: 2048,
      requestTimeoutMs: 30_000,
    })).toMatchObject({ model: 'gpt-5-mini', enabled: true })

    expect(() => projectAiConnectionUpsertRequestSchema.parse({
      provider: AI_PROVIDER.OPENAI,
      model: '../invalid model',
      apiKey: 'short',
      enabled: true,
      maxOutputTokens: 100_000,
      requestTimeoutMs: 30_000,
    })).toThrow()
  })

  it('validates a bounded question and a content-safe cited answer', () => {
    expect(projectAssistantTurnRequestSchema.parse({ question: '  Где описана авторизация?  ' }))
      .toEqual({ question: 'Где описана авторизация?' })
    expect(projectAssistantTurnResponseSchema.parse({
      answer: 'Авторизация описана в документации.',
      citations: [{
        documentId: '00000000-0000-4000-8000-000000000103',
        title: 'Авторизация',
      }],
      usage: { inputTokens: 91, outputTokens: 12 },
    })).toMatchObject({
      answer: 'Авторизация описана в документации.',
      citations: [{ title: 'Авторизация' }],
    })

    expect(() => projectAssistantTurnRequestSchema.parse({ question: '' })).toThrow()
    expect(() => projectAssistantTurnResponseSchema.parse({
      answer: 'Ответ',
      citations: [{ documentId: 'not-a-document-id', title: 'Подмена' }],
      usage: { inputTokens: null, outputTokens: null },
    })).toThrow()
  })

  it('accepts only the closed public streaming event vocabulary', () => {
    expect(projectAssistantStreamEventSchema.parse({
      type: 'context',
      citations: [{
        documentId: '00000000-0000-4000-8000-000000000103',
        title: 'Авторизация',
      }],
    })).toMatchObject({ type: 'context' })
    expect(projectAssistantStreamEventSchema.parse({
      type: 'delta',
      delta: 'Права проверяются.',
    })).toEqual({ type: 'delta', delta: 'Права проверяются.' })
    expect(projectAssistantStreamEventSchema.parse({
      type: 'completed',
      citations: [],
      usage: { inputTokens: null, outputTokens: null },
    })).toMatchObject({ type: 'completed' })
    expect(projectAssistantStreamEventSchema.parse({
      type: 'error',
      code: 'PERMISSION_DENIED',
    })).toEqual({ type: 'error', code: 'PERMISSION_DENIED' })

    expect(() => projectAssistantStreamEventSchema.parse({
      type: 'error',
      code: 'RAW_PROVIDER_ERROR',
      providerPayload: 'secret',
    })).toThrow()
  })
})
