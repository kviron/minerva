import {
  createError,
  defineEventHandler,
  getValidatedRouterParams,
  readValidatedBody,
  setHeader,
} from 'h3'
import {
  projectAiRouteParamsSchema,
  projectAssistantTurnRequestSchema,
  projectAssistantTurnResponseSchema,
} from '../../../../../shared/ai-assistant/contracts'
import { projectAssistantTurnHttpError } from '../../../../modules/ai-assistant/http'
import { getProjectAssistantTurnService } from '../../../../modules/ai-assistant/runtime'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let params
  let body
  try {
    params = await getValidatedRouterParams(event, value => projectAiRouteParamsSchema.parse(value))
    body = await readValidatedBody(event, value => projectAssistantTurnRequestSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid assistant question' })
  }

  const session = await requireSession(event)
  const result = await getProjectAssistantTurnService().answer({
    projectId: params.id,
    actorUserId: session.user.id,
    question: body.question,
  })
  if (!result.ok) {
    throw projectAssistantTurnHttpError(result.code)
  }
  return projectAssistantTurnResponseSchema.parse(result.value)
})
