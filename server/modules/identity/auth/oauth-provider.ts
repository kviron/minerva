import { getOAuthProviderState, oauthProvider } from '@better-auth/oauth-provider'
import { MCP_SCOPES } from '../../../../shared/mcp/constants'
import { resolveOAuthConsentReference } from './oauth-consent-reference'

type MinervaOAuthProviderInput = Readonly<{
  resource: string
  ensureActiveGrant?: Parameters<typeof resolveOAuthConsentReference>[0]['ensureActive']
}>

export const createMinervaOAuthProvider = ({ resource, ensureActiveGrant }: MinervaOAuthProviderInput) => oauthProvider({
  loginPage: '/auth',
  consentPage: '/oauth/consent',
  scopes: [...MCP_SCOPES],
  validAudiences: [resource],
  grantTypes: ['authorization_code', 'refresh_token'],
  allowDynamicClientRegistration: false,
  allowUnauthenticatedClientRegistration: false,
  disableJwtPlugin: true,
  storeTokens: 'hashed',
  ...(ensureActiveGrant
    ? {
        postLogin: {
          page: '/oauth/consent',
          shouldRedirect: () => false,
          async consentReferenceId({ user, scopes }) {
            if (!user) throw new Error('OAuth consent user is unavailable')
            return resolveOAuthConsentReference({
              state: await getOAuthProviderState(),
              userId: user.id,
              scopes,
              canonicalResource: resource,
              ensureActive: ensureActiveGrant,
            })
          },
        },
      }
    : {}),
  rateLimit: {
    token: { window: 60, max: 20 },
    authorize: { window: 60, max: 30 },
    introspect: { window: 60, max: 100 },
    revoke: { window: 60, max: 30 },
    register: { window: 60, max: 5 },
    userinfo: { window: 60, max: 60 },
  },
})
