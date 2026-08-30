import { describe, expect, it, vi } from 'vitest'
import { AI_PROVIDER } from '../../../shared/ai-assistant/constants'
import { createProjectAiProviderTester } from '../../../server/modules/ai-assistant/openai-connection-test'

describe('OpenAI connection test adapter', () => {
  it('uses a fixed HTTPS origin, disables redirects, and applies the configured timeout', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const testProvider = createProjectAiProviderTester(request)

    await expect(testProvider({
      provider: AI_PROVIDER.OPENAI,
      model: 'gpt-5-mini',
      apiKey: 'sk-private',
      timeoutMs: 5_000,
    })).resolves.toEqual({ reachable: true })

    expect(request).toHaveBeenCalledWith('https://api.openai.com/v1/models/gpt-5-mini', expect.objectContaining({
      method: 'GET',
      redirect: 'error',
      signal: expect.any(AbortSignal),
    }))
  })

  it('maps timeout and provider failures to a content-free result', async () => {
    const request = vi.fn().mockRejectedValue(new DOMException('secret provider payload', 'TimeoutError'))
    const result = await createProjectAiProviderTester(request)({
      provider: AI_PROVIDER.OPENAI,
      model: 'gpt-5-mini',
      apiKey: 'sk-private',
      timeoutMs: 5_000,
    })

    expect(result).toEqual({ reachable: false })
    expect(JSON.stringify(result)).not.toContain('secret')
  })
})
