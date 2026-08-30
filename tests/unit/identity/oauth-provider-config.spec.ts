import { describe, expect, it } from 'vitest'
import { MCP_SCOPE, MCP_SCOPES } from '../../../shared/mcp/constants'
import { createMinervaOAuthProvider } from '../../../server/modules/identity/auth/oauth-provider'

describe('Minerva OAuth Provider configuration', () => {
  it('uses a closed delegated scope and audience vocabulary', () => {
    expect(MCP_SCOPES).toEqual([
      MCP_SCOPE.OFFLINE_ACCESS,
      MCP_SCOPE.PROJECTS_READ,
      MCP_SCOPE.DOCUMENTS_READ,
      MCP_SCOPE.DOCUMENTS_WRITE,
      MCP_SCOPE.DOCUMENTS_PUBLISH,
    ])

    const provider = createMinervaOAuthProvider({ resource: 'https://minerva.example/mcp' })

    expect(provider.options).toMatchObject({
      loginPage: '/auth',
      consentPage: '/oauth/consent',
      scopes: MCP_SCOPES,
      validAudiences: ['https://minerva.example/mcp'],
      grantTypes: ['authorization_code', 'refresh_token'],
      allowDynamicClientRegistration: false,
      allowUnauthenticatedClientRegistration: false,
      disableJwtPlugin: true,
      storeTokens: 'hashed',
    })
  })

  it('keeps explicit database-backed endpoint limits enabled', () => {
    const provider = createMinervaOAuthProvider({ resource: 'https://minerva.example/mcp' })

    expect(provider.options.rateLimit).toEqual({
      token: { window: 60, max: 20 },
      authorize: { window: 60, max: 30 },
      introspect: { window: 60, max: 100 },
      revoke: { window: 60, max: 30 },
      register: { window: 60, max: 5 },
      userinfo: { window: 60, max: 60 },
    })
  })
})
