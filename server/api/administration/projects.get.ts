import { createError, defineEventHandler, getValidatedQuery, setHeader } from 'h3'
import { projectListQuerySchema } from '../../../shared/projects/contracts'
import { AuthorizationError } from '../../modules/authorization/authorization-error'
import { requireSession } from '../../modules/identity/session/require-session'
import { listAllProjects } from '../../modules/projects/list-projects'
import { decodeProjectListCursor } from '../../modules/projects/project-list-cursor'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSession(event)
  let options
  try {
    const query = await getValidatedQuery(event, value => projectListQuerySchema.parse(value))
    options = { limit: query.limit, cursor: decodeProjectListCursor(query.cursor) }
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }
  const result = await listAllProjects(
    { superAdmin: session.user.superAdmin === true },
    options,
  )
  if (!result.ok) throw new AuthorizationError(result.code)
  return result.value
})
