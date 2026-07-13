import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { listCurrentUserDocumentTree } from '../../../../modules/documents/read-documents'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const projectId = getRouterParam(event, 'id')
  if (!projectId) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const tree = await listCurrentUserDocumentTree(projectId, session.user.id)
  if (tree === null) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  setHeader(event, 'Cache-Control', 'private, no-store')
  return tree
})
