import { describe, expect, it } from 'vitest'
import {
  oauthGrantRouteParamsSchema,
  oauthGrantSummariesResponseSchema,
  oauthConsentDecisionResponseSchema,
  revokeOAuthGrantRequestSchema,
} from '../../../shared/oauth-grants/contracts'

const grant = {
  id: '00000000-0000-4000-8000-000000000053',
  client: { id: 'desktop-ai', name: 'Desktop AI' },
  resource: 'https://minerva.example/mcp',
  scopes: ['documents:read'],
  createdAt: '2026-07-14T12:00:00.000Z',
  updatedAt: '2026-07-14T12:00:00.000Z',
}

describe('OAuth grant contracts', () => {
  it('accepts safe summaries and rejects token material', () => {
    expect(oauthGrantSummariesResponseSchema.parse([grant])).toEqual([grant])
    expect(() => oauthGrantSummariesResponseSchema.parse([{ ...grant, accessToken: 'secret' }])).toThrow()
  })

  it('validates revocation input and route identity', () => {
    expect(oauthGrantRouteParamsSchema.parse({ grantId: grant.id })).toEqual({ grantId: grant.id })
    expect(revokeOAuthGrantRequestSchema.parse({ expectedUpdatedAt: grant.updatedAt })).toEqual({ expectedUpdatedAt: grant.updatedAt })
    expect(() => revokeOAuthGrantRequestSchema.parse({ expectedUpdatedAt: 'yesterday' })).toThrow()
  })

  it('validates the redirect returned after a consent decision', () => {
    expect(oauthConsentDecisionResponseSchema.parse({ redirect: true, url: 'https://client.example/callback' }))
      .toEqual({ redirect: true, url: 'https://client.example/callback' })
    expect(() => oauthConsentDecisionResponseSchema.parse({ redirect: true, url: '/unsafe-relative-path' })).toThrow()
    expect(() => oauthConsentDecisionResponseSchema.parse({ redirect: true, url: 'https://client.example', token: 'secret' })).toThrow()
  })
})
