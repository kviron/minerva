import type { OAuthGrantSummariesResponse, OAuthGrantSummary } from '../../../../shared/oauth-grants/contracts'
import { oauthGrantSummariesResponseSchema } from '../../../../shared/oauth-grants/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export const oauthGrantsApi = {
  async list(): Promise<OAuthGrantSummariesResponse> {
    const response: unknown = await $fetch('/api/oauth/grants')
    return decodeApiResponse(oauthGrantSummariesResponseSchema, response, 'GET /api/oauth/grants')
  },
  async revoke(grant: Pick<OAuthGrantSummary, 'id' | 'updatedAt'>): Promise<void> {
    await $fetch(`/api/oauth/grants/${grant.id}/revoke`, {
      method: 'POST',
      body: { expectedUpdatedAt: grant.updatedAt },
    })
  },
}
