import {
  defineEventHandler,
  getRouterParam,
  readMultipartFormData,
  setHeader,
  setResponseStatus,
} from 'h3'
import { AUDIT_CHANNEL } from '../../../../shared/projects/constants'
import { projectRouteParamsSchema } from '../../../../shared/projects/contracts'
import { requireSession } from '../../../modules/identity/session/require-session'
import { PROJECT_ICON_ERROR, uploadProjectIcon } from '../../../modules/projects/project-icons'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const params = projectRouteParamsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!params.success) {
    setResponseStatus(event, 400)
    return { data: { code: PROJECT_ICON_ERROR.INVALID_IMAGE } }
  }
  const session = await requireSession(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.type)
  if (!file?.type) {
    setResponseStatus(event, 400)
    return { data: { code: PROJECT_ICON_ERROR.INVALID_IMAGE } }
  }

  const result = await uploadProjectIcon({
    actorUserId: session.user.id,
    projectId: params.data.id,
    channel: AUDIT_CHANNEL.WEB,
    mimeType: file.type,
    bytes: file.data,
  })
  if (result.ok) return result.value
  setResponseStatus(event, result.code === PROJECT_ICON_ERROR.INVALID_IMAGE
    ? 400
    : result.code === PROJECT_ICON_ERROR.NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
