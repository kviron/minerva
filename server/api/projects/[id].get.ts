import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireSession } from '../../modules/identity/session/require-session'
import { getCurrentUserProjectOverview } from '../../modules/projects/get-project-overview'

interface ProjectSession {
  readonly user: { readonly id: string }
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event) as ProjectSession
  const projectId = getRouterParam(event, 'id')

  if (!projectId) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const project = await getCurrentUserProjectOverview(projectId, session.user.id)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  return project
})
