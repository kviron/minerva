import { createError, defineEventHandler, getValidatedRouterParams, setHeader } from 'h3'
import { projectRouteParamsSchema } from '../../../shared/projects/contracts'
import { requireSession } from '../../modules/identity/session/require-session'
import { getCurrentUserProjectOverview } from '../../modules/projects/get-project-overview'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSession(event)
  let projectId: string
  try {
    const params = await getValidatedRouterParams(event, value => projectRouteParamsSchema.parse(value))
    projectId = params.id
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const project = await getCurrentUserProjectOverview(projectId, session.user.id)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return project
})
