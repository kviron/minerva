import { createError, defineEventHandler, getValidatedQuery, setHeader } from 'h3'
import { projectListQuerySchema } from '../../../shared/projects/contracts'
import { requireSession } from '../../modules/identity/session/require-session'
import { decodeProjectListCursor } from '../../modules/projects/project-list-cursor'
import { listCurrentUserProjects } from '../../modules/projects/list-projects'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSession(event)
  try {
    const query = await getValidatedQuery(event, value => projectListQuerySchema.parse(value))
    return listCurrentUserProjects(session.user.id, {
      limit: query.limit,
      cursor: decodeProjectListCursor(query.cursor),
    })
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }
})
