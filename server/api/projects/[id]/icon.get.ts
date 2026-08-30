import { createError, defineEventHandler, getRouterParam, send, setHeader } from 'h3'
import { projectRouteParamsSchema } from '../../../../shared/projects/contracts'
import { requireSession } from '../../../modules/identity/session/require-session'
import { readProjectIcon } from '../../../modules/projects/project-icons'

export default defineEventHandler(async (event) => {
  const params = projectRouteParamsSchema.safeParse({ id: getRouterParam(event, 'id') })
  if (!params.success) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const session = await requireSession(event)
  const icon = await readProjectIcon({ actorUserId: session.user.id, projectId: params.data.id })
  if (!icon) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  setHeader(event, 'Content-Type', icon.mimeType)
  setHeader(event, 'Content-Disposition', 'inline')
  setHeader(event, 'Cache-Control', 'private, no-store')
  return send(event, icon.bytes)
})
