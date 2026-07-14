import { defineEventHandler, getRouterParam, setHeader, setResponseStatus } from 'h3'
import { getDatabase } from '../../../../../infrastructure/database/client'
import { listDocumentVersionsForUser } from '../../../../../modules/documents/document-versions'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  setHeader(event, 'cache-control', 'no-store')
  const versions = await listDocumentVersionsForUser(
    getDatabase().db,
    getRouterParam(event, 'id') ?? '',
    getRouterParam(event, 'documentId') ?? '',
    session.user.id,
  )
  if (!versions) {
    setResponseStatus(event, 404)
    return { data: { code: 'NOT_FOUND' } }
  }
  return versions
})
