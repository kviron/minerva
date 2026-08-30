import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider'

type OAuthMetadataAuth = Parameters<typeof oauthProviderAuthServerMetadata>[0]

export const createOAuthAuthorizationServerMetadataHandler = (auth: OAuthMetadataAuth) =>
  oauthProviderAuthServerMetadata(auth)
