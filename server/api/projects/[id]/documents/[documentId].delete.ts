import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../shared/projects/constants'
import { ARCHIVE_DOCUMENT_ERROR, archiveDocument } from '../../../../modules/documents/document-archive'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const result = await archiveDocument({
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    documentId: getRouterParam(event, 'documentId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return result.value
  setResponseStatus(event, result.code === ARCHIVE_DOCUMENT_ERROR.NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
