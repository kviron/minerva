import { describe, expect, it, vi } from 'vitest'
import { createOAuthAuthorizationServerMetadataHandler } from '../../../server/modules/identity/auth/oauth-metadata'
import { buildAuthorizationServerIssuer } from '../../../server/modules/mcp/protected-resource-metadata'

describe('MCP OAuth discovery metadata', () => {
  it('derives the Better Auth issuer from the configured public origin', () => {
    expect(buildAuthorizationServerIssuer('https://minerva.example')).toBe('https://minerva.example/api/auth')
  })

  it('exports Better Auth authorization-server metadata at the root alias', async () => {
    const getOAuthServerConfig = vi.fn().mockResolvedValue({
      issuer: 'https://minerva.example/api/auth',
      scopes_supported: ['projects:read'],
    })
    const handler = createOAuthAuthorizationServerMetadataHandler({ api: { getOAuthServerConfig } })

    const response = await handler(new Request('https://minerva.example/.well-known/oauth-authorization-server/api/auth'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('cache-control')).toContain('max-age=15')
    await expect(response.json()).resolves.toEqual({
      issuer: 'https://minerva.example/api/auth',
      scopes_supported: ['projects:read'],
    })
    expect(getOAuthServerConfig).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.any(Request),
      asResponse: false,
    }))
  })
})
