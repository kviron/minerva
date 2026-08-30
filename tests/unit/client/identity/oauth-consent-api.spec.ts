import { describe, expect, it, vi } from 'vitest'
import { InvalidApiResponseError } from '../../../../app/shared/api/decode-api-response'
import { createOAuthConsentApi } from '../../../../app/features/oauth-grants/api/oauth-consent-api'

describe('OAuth consent API', () => {
  it('sends the decision and validates the redirect response', async () => {
    const request = vi.fn().mockResolvedValue({ redirect: true, url: 'https://client.example/callback' })
    const api = createOAuthConsentApi(request)

    await expect(api.decide({ accept: true, oauthQuery: 'signed-query' }))
      .resolves.toEqual({ redirect: true, url: 'https://client.example/callback' })
    expect(request).toHaveBeenCalledWith({ accept: true, oauth_query: 'signed-query' })
  })

  it('rejects an invalid Better Auth response at the transport boundary', async () => {
    const api = createOAuthConsentApi(vi.fn().mockResolvedValue({ url: '/relative' }))

    await expect(api.decide({ accept: false, oauthQuery: 'signed-query' }))
      .rejects.toBeInstanceOf(InvalidApiResponseError)
  })
})
