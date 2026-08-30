import { describe, expect, it } from 'vitest'
import { MCP_SCOPES } from '../../../shared/mcp/constants'
import { buildProtectedResourceMetadata } from '../../../server/modules/mcp/protected-resource-metadata'

describe('MCP protected resource metadata', () => {
  it('publishes one exact resource and authorization server', () => {
    expect(buildProtectedResourceMetadata({
      issuer: 'https://minerva.example/api/auth',
      resource: 'https://minerva.example/mcp',
    })).toEqual({
      resource: 'https://minerva.example/mcp',
      authorization_servers: ['https://minerva.example/api/auth'],
      scopes_supported: MCP_SCOPES,
      bearer_methods_supported: ['header'],
      resource_name: 'Minerva MCP',
    })
  })
})
