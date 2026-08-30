import { defineEventHandler, getRouterParam, setHeader, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../shared/projects/constants'
import { projectRouteParamsSchema } from '../../../../shared/projects/contracts'
import { requireSession } from '../../../modules/identity/session/require-session'
import { deleteProjectIcon, PROJECT_ICON_ERROR } from '../../../modules/projects/project-icons'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const params = projectRouteParamsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!params.success) {
    setResponseStatus(event, 404)
    return { data: { code: PROJECT_ICON_ERROR.NOT_FOUND } }
  }
  const session = await requireSession(event)
  const result = await deleteProjectIcon({
    actorUserId: session.user.id,
    projectId: params.data.id,
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return result.value
  setResponseStatus(event, result.code === PROJECT_ICON_ERROR.NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
