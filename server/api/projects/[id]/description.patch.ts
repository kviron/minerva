import { defineEventHandler, getRouterParam, readValidatedBody, setHeader, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../shared/projects/constants'
import { projectRouteParamsSchema, updateProjectDescriptionRequestSchema } from '../../../../shared/projects/contracts'
import { requireSession } from '../../../modules/identity/session/require-session'
import { PROJECT_DESCRIPTION_ERROR, updateProjectDescription } from '../../../modules/projects/project-description'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const params = projectRouteParamsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!params.success) {
    setResponseStatus(event, 404)
    return { data: { code: PROJECT_DESCRIPTION_ERROR.NOT_FOUND } }
  }
  const body = await readValidatedBody(event, value => updateProjectDescriptionRequestSchema.safeParse(value))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: PROJECT_DESCRIPTION_ERROR.INVALID_DESCRIPTION } }
  }
  const session = await requireSession(event)
  const result = await updateProjectDescription({
    actorUserId: session.user.id,
    projectId: params.data.id,
    channel: AUDIT_CHANNEL.WEB,
    content: body.data.content,
  })
  if (result.ok) return result.value
  setResponseStatus(event, result.code === PROJECT_DESCRIPTION_ERROR.INVALID_DESCRIPTION ? 400 : result.code === PROJECT_DESCRIPTION_ERROR.NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
