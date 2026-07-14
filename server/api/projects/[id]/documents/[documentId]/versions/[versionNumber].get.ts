import { defineEventHandler, getRouterParam, setHeader, setResponseStatus } from 'h3'
import { getDatabase } from '../../../../../../infrastructure/database/client'
import { getDocumentVersionForUser } from '../../../../../../modules/documents/document-versions'
import { requireSession } from '../../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  setHeader(event, 'cache-control', 'no-store')
  const versionNumber = Number(getRouterParam(event, 'versionNumber'))
  const version = await getDocumentVersionForUser(
    getDatabase().db,
    getRouterParam(event, 'id') ?? '',
    getRouterParam(event, 'documentId') ?? '',
    versionNumber,
    session.user.id,
  )
  if (!version) {
    setResponseStatus(event, 404)
    return { data: { code: 'NOT_FOUND' } }
  }
  return version
})
