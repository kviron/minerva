import { createError, defineEventHandler, getValidatedRouterParams, setHeader } from 'h3'
import { projectRouteParamsSchema } from '../../../../shared/projects/contracts'
import { requireSession } from '../../../modules/identity/session/require-session'
import { listProjectMembers } from '../../../modules/projects/list-project-members'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  let projectId: string
  try {
    projectId = (await getValidatedRouterParams(event, value => projectRouteParamsSchema.parse(value))).id
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const session = await requireSession(event)
  const members = await listProjectMembers(projectId, session.user.id)
  if (members === null) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  return members
})
