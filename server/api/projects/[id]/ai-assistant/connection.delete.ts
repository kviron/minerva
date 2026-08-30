import { createError, defineEventHandler, getValidatedRouterParams, setHeader } from 'h3'
import { projectAiRouteParamsSchema } from '../../../../../shared/ai-assistant/contracts'
import { projectAiConnectionHttpError } from '../../../../modules/ai-assistant/http'
import { getProjectAiConnectionService } from '../../../../modules/ai-assistant/runtime'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let params
  try {
    params = await getValidatedRouterParams(event, value => projectAiRouteParamsSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const session = await requireSession(event)
  const result = await getProjectAiConnectionService().disconnect({
    projectId: params.id,
    actorUserId: session.user.id,
  })
  if (!result.ok) throw projectAiConnectionHttpError(result.code)
  return result.value
})
