import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { requireSession } from '../../../../modules/identity/session/require-session'
import { listCurrentUserRootDocuments } from '../../../../modules/documents/list-root-documents'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const projectId = getRouterParam(event, 'id')

  if (!projectId) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const documents = await listCurrentUserRootDocuments(projectId, session.user.id)
  if (documents === null) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  setHeader(event, 'Cache-Control', 'private, no-store')
  return documents
})
