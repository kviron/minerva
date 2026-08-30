import { describe, expect, it, vi } from 'vitest'
import { createProjectAiConnectionsApi } from '../../../../app/features/ai-assistant/api/project-ai-connections-api'
import { InvalidApiResponseError } from '../../../../app/shared/api/decode-api-response'
import {
  AI_ASSISTANT_AVAILABILITY,
  AI_CONNECTION_STATUS,
  AI_PROVIDER,
} from '../../../../shared/ai-assistant/constants'

const connection = {
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

describe('project AI connections client API', () => {
  it('validates safe responses for availability, read, save, test, and disconnect', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ availability: AI_ASSISTANT_AVAILABILITY.NOT_CONFIGURED })
      .mockResolvedValueOnce({ connection: null })
      .mockResolvedValueOnce({ connection })
      .mockResolvedValueOnce({ connection: { ...connection, status: AI_CONNECTION_STATUS.VALID }, reachable: true })
      .mockResolvedValueOnce({ disconnected: true })
    const api = createProjectAiConnectionsApi(request)

    await expect(api.loadAvailability('project-1'))
      .resolves.toEqual({ availability: AI_ASSISTANT_AVAILABILITY.NOT_CONFIGURED })
    await expect(api.load('project-1')).resolves.toEqual({ connection: null })
    await expect(api.save('project-1', {
      provider: AI_PROVIDER.OPENAI,
      model: 'gpt-5-mini',
      apiKey: 'sk-test-12345678901234567890',
      enabled: true,
      systemInstructions: null,
      maxOutputTokens: 2048,
      requestTimeoutMs: 30_000,
    })).resolves.toEqual({ connection })
    await expect(api.test('project-1')).resolves.toMatchObject({ reachable: true })
    await expect(api.disconnect('project-1')).resolves.toEqual({ disconnected: true })
  })

  it('rejects secret material returned by a compromised endpoint', async () => {
    const api = createProjectAiConnectionsApi(vi.fn().mockResolvedValue({
      connection: { ...connection, apiKey: 'leaked' },
    }))

    await expect(api.load('project-1')).rejects.toBeInstanceOf(InvalidApiResponseError)
  })
})
