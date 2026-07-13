import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { getCurrentUserDocument } from '../../../../modules/documents/read-documents'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const projectId = getRouterParam(event, 'id')
  const documentId = getRouterParam(event, 'documentId')
  if (!projectId || !documentId) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const document = await getCurrentUserDocument(projectId, documentId, session.user.id)
  if (document === null) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  setHeader(event, 'Cache-Control', 'private, no-store')
  return document
})
