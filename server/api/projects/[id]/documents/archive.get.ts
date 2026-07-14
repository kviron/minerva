import { defineEventHandler, getRouterParam, setHeader, setResponseStatus } from 'h3'
import { listArchivedDocumentBatches } from '../../../../modules/documents/document-archive'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const result = await listArchivedDocumentBatches(getRouterParam(event, 'id') ?? '', session.user.id)
  if (result !== null) {
    setHeader(event, 'Cache-Control', 'private, no-store')
    return result
  }
  setResponseStatus(event, 404)
  return { data: { code: 'NOT_FOUND' } }
})
