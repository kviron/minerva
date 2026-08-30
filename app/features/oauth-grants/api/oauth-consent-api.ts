import type { OAuthConsentDecisionResponse } from '../../../../shared/oauth-grants/contracts'
import { oauthConsentDecisionResponseSchema } from '../../../../shared/oauth-grants/contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export interface OAuthConsentDecision {
  readonly accept: boolean
  readonly oauthQuery: string
}

interface OAuthConsentRequestBody {
  readonly accept: boolean
  readonly oauth_query: string
}

export type OAuthConsentRequest = (body: OAuthConsentRequestBody) => Promise<unknown>

export const createOAuthConsentApi = (request: OAuthConsentRequest) => ({
  async decide(input: OAuthConsentDecision): Promise<OAuthConsentDecisionResponse> {
    const response = await request({ accept: input.accept, oauth_query: input.oauthQuery })
    return decodeApiResponse(
      oauthConsentDecisionResponseSchema,
      response,
      'POST /api/auth/oauth2/consent',
    )
  },
})

const runtimeOAuthConsentRequest: OAuthConsentRequest = body =>
  $fetch<unknown>('/api/auth/oauth2/consent', { method: 'POST', body })

export const oauthConsentApi = createOAuthConsentApi(runtimeOAuthConsentRequest)
