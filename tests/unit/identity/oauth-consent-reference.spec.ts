import { describe, expect, it, vi } from 'vitest'
import { resolveOAuthConsentReference } from '../../../server/modules/identity/auth/oauth-consent-reference'

describe('OAuth consent grant reference', () => {
  it('uses the validated authorization client and canonical configured resource', async () => {
    const ensureActive = vi.fn().mockResolvedValue('00000000-0000-4000-8000-000000000053')

    await expect(resolveOAuthConsentReference({
      state: { query: 'client_id=desktop-ai&resource=https%3A%2F%2Fattacker.example%2Fmcp' },
      userId: '00000000-0000-4000-8000-000000000051',
      scopes: ['documents:read'],
      canonicalResource: 'https://minerva.example/mcp',
      ensureActive,
    })).resolves.toBe('00000000-0000-4000-8000-000000000053')

    expect(ensureActive).toHaveBeenCalledWith({
      actorUserId: '00000000-0000-4000-8000-000000000051',
      clientId: 'desktop-ai',
      resource: 'https://minerva.example/mcp',
      scopes: ['documents:read'],
    })
  })

  it('rejects missing provider state instead of creating an unbound grant', async () => {
    await expect(resolveOAuthConsentReference({
      state: null,
      userId: '00000000-0000-4000-8000-000000000051',
      scopes: ['documents:read'],
      canonicalResource: 'https://minerva.example/mcp',
      ensureActive: vi.fn(),
    })).rejects.toThrow('OAuth authorization context is unavailable')
  })
})
