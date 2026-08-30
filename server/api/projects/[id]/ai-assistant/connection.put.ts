import { createError, defineEventHandler, getValidatedRouterParams, readValidatedBody, setHeader } from 'h3'
import {
  projectAiConnectionUpsertRequestSchema,
  projectAiRouteParamsSchema,
} from '../../../../../shared/ai-assistant/contracts'
import { projectAiConnectionHttpError } from '../../../../modules/ai-assistant/http'
import { getProjectAiConnectionService } from '../../../../modules/ai-assistant/runtime'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let params
  let body
  try {
    params = await getValidatedRouterParams(event, value => projectAiRouteParamsSchema.parse(value))
    body = await readValidatedBody(event, value => projectAiConnectionUpsertRequestSchema.parse(value))
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid AI connection configuration' })
  }
  const session = await requireSession(event)
  const result = await getProjectAiConnectionService().save({
    projectId: params.id,
    actorUserId: session.user.id,
    input: body,
  })
  if (!result.ok) throw projectAiConnectionHttpError(result.code)
  return { connection: result.value }
})
