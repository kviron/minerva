import { createError, defineEventHandler, getValidatedRouterParams, readValidatedBody, setHeader, setResponseStatus } from 'h3'
import { oauthGrantRouteParamsSchema, revokeOAuthGrantRequestSchema } from '../../../../../shared/oauth-grants/contracts'
import { AUDIT_CHANNEL } from '../../../../../shared/projects/constants'
import { getDatabase } from '../../../../infrastructure/database/client'
import {
  createOAuthGrantManagement,
  OAUTH_GRANT_REVOCATION_RESULT,
} from '../../../../modules/identity/oauth-grants'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSession(event)
  let params
  try {
    params = await getValidatedRouterParams(event, value => oauthGrantRouteParamsSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  let body
  try {
    body = await readValidatedBody(event, value => revokeOAuthGrantRequestSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }
  const result = await createOAuthGrantManagement(getDatabase().db).revoke({
    actorUserId: session.user.id,
    grantId: params.grantId,
    expectedUpdatedAt: body.expectedUpdatedAt,
    channel: AUDIT_CHANNEL.WEB,
  })

  if (result.type === OAUTH_GRANT_REVOCATION_RESULT.NOT_FOUND) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  if (result.type === OAUTH_GRANT_REVOCATION_RESULT.STALE) {
    throw createError({ statusCode: 409, statusMessage: 'Conflict' })
  }
  if (result.type === OAUTH_GRANT_REVOCATION_RESULT.ACCOUNT_INACTIVE) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  setResponseStatus(event, 204)
  return null
})
