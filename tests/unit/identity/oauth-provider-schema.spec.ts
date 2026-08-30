import { oauthProvider } from '@better-auth/oauth-provider'
import { describe, expect, it } from 'vitest'

const provider = oauthProvider({
  loginPage: '/auth',
  consentPage: '/oauth/consent',
  scopes: ['projects:read', 'documents:read', 'documents:write', 'documents:publish'],
  validAudiences: ['https://minerva.example/mcp'],
  allowDynamicClientRegistration: false,
  disableJwtPlugin: true,
})

describe('Better Auth OAuth Provider schema contract', () => {
  it('provides the four OAuth persistence models required by the provider', () => {
    expect(Object.keys(provider.schema ?? {})).toEqual([
      'oauthClient',
      'oauthRefreshToken',
      'oauthAccessToken',
      'oauthConsent',
    ])
  })

  it('links opaque access tokens to refresh tokens for family revocation', () => {
    expect(provider.schema?.oauthAccessToken?.fields.refreshId?.references).toEqual({
      model: 'oauthRefreshToken',
      field: 'id',
    })
    expect(provider.schema?.oauthRefreshToken?.fields.revoked).toMatchObject({
      type: 'date',
      required: false,
    })
  })

  it('requires a Minerva grant linkage because provider tokens do not reference consent', () => {
    expect(provider.schema?.oauthConsent?.fields).not.toHaveProperty('grantId')
    expect(provider.schema?.oauthRefreshToken?.fields).not.toHaveProperty('consentId')
    expect(provider.schema?.oauthAccessToken?.fields).not.toHaveProperty('consentId')
  })

  it('exposes introspection, token revocation, and user consent deletion separately', () => {
    expect(provider.endpoints).toMatchObject({
      oauth2Introspect: expect.anything(),
      oauth2Revoke: expect.anything(),
      deleteOAuthConsent: expect.anything(),
    })
  })
})
