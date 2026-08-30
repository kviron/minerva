import { randomUUID } from 'node:crypto'
import { defineEventHandler, getRequestIP, sendWebResponse, toWebRequest } from 'h3'
import { getServerEnv } from '../config/runtime-env'
import { getDatabase } from '../infrastructure/database/client'
import { createMcpBearerValidator } from '../modules/mcp/bearer-validator'
import { createMcpAuthenticationAudit } from '../modules/mcp/authentication-audit'
import { createMcpHttpHandler } from '../modules/mcp/http-handler'
import { buildAuthorizationServerIssuer } from '../modules/mcp/protected-resource-metadata'
import { consumeMcpRateLimit } from '../modules/mcp/rate-limit'
import { handleMinervaMcpRequest } from '../modules/mcp/server'
import { createMcpTokenStore } from '../modules/mcp/token-store'

export default defineEventHandler(async (event) => {
  const env = getServerEnv()
  const database = getDatabase()
  const validateMcpBearer = createMcpBearerValidator({
    findByTokenHash: createMcpTokenStore(database.db).findByTokenHash,
    now: () => new Date(),
    createRequestId: randomUUID,
    issuer: buildAuthorizationServerIssuer(env.BETTER_AUTH_URL),
    resource: env.MCP_RESOURCE_URL,
  })
  const authenticationAudit = createMcpAuthenticationAudit(database.db)
  const handleMcpHttp = createMcpHttpHandler({
    allowedOrigins: env.TRUSTED_ORIGINS,
    maxBodyBytes: 1_048_576,
    resourceMetadataUrl: new URL('/.well-known/oauth-protected-resource/mcp', env.BETTER_AUTH_URL).toString(),
    consumeRateLimit: (ip, token) => consumeMcpRateLimit({
      database,
      secret: env.RATE_LIMIT_HMAC_SECRET,
      ip,
      token: token ?? 'missing',
      nowEpochSeconds: Math.floor(Date.now() / 1000),
      max: 120,
      windowSeconds: 60,
    }),
    validateBearer: validateMcpBearer,
    recordRejectedAuthentication: authenticationAudit.recordRejected,
    dispatch: handleMinervaMcpRequest,
  })

  return sendWebResponse(
    event,
    await handleMcpHttp(
      toWebRequest(event),
      getRequestIP(event, { xForwardedFor: env.TRUST_PROXY }) ?? 'unknown',
    ),
  )
})
