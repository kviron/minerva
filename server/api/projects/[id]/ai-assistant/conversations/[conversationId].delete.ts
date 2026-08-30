import { createError, defineEventHandler, getValidatedRouterParams, setHeader } from 'h3'
import { projectAiConversationRouteParamsSchema } from '../../../../../../shared/ai-assistant/contracts'
import { projectAiConversationHttpError } from '../../../../../modules/ai-assistant/http'
import { getProjectAiConversationService } from '../../../../../modules/ai-assistant/runtime'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let params
  try {
    params = await getValidatedRouterParams(event, value => projectAiConversationRouteParamsSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const session = await requireSession(event)
  const result = await getProjectAiConversationService().archive({
    projectId: params.id,
    conversationId: params.conversationId,
    actorUserId: session.user.id,
  })
  if (!result.ok) throw projectAiConversationHttpError(result.code)
  return result.value
})
