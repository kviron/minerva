import { defineEventHandler, setHeader } from 'h3'
import { getServerEnv } from '../../../config/runtime-env'
import {
  buildAuthorizationServerIssuer,
  buildProtectedResourceMetadata,
} from '../../../modules/mcp/protected-resource-metadata'

export default defineEventHandler((event) => {
  const env = getServerEnv()
  setHeader(event, 'Cache-Control', 'public, max-age=15, stale-while-revalidate=15, stale-if-error=86400')

  return buildProtectedResourceMetadata({
    issuer: buildAuthorizationServerIssuer(env.BETTER_AUTH_URL),
    resource: env.MCP_RESOURCE_URL,
  })
})
