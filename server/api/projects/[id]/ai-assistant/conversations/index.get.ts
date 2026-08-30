import { createError, defineEventHandler, getValidatedQuery, getValidatedRouterParams, setHeader } from 'h3'
import {
  projectAiConversationListQuerySchema,
  projectAiRouteParamsSchema,
} from '../../../../../../shared/ai-assistant/contracts'
import { projectAiConversationHttpError } from '../../../../../modules/ai-assistant/http'
import { getProjectAiConversationService } from '../../../../../modules/ai-assistant/runtime'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let params
  let query
  try {
    params = await getValidatedRouterParams(event, value => projectAiRouteParamsSchema.parse(value))
    query = await getValidatedQuery(event, value => projectAiConversationListQuerySchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid conversation list request' })
  }
  const session = await requireSession(event)
  try {
    const result = await getProjectAiConversationService().list({
      projectId: params.id,
      actorUserId: session.user.id,
      ...query,
    })
    if (!result.ok) throw projectAiConversationHttpError(result.code)
    return result.value
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 400, statusMessage: 'Invalid conversation cursor' })
  }
})
