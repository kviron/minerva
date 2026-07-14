import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../../shared/projects/constants'
import {
  DISCARD_DOCUMENT_ERROR,
  discardDocument,
} from '../../../../../modules/documents/document-archive'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const result = await discardDocument({
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    documentId: getRouterParam(event, 'documentId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) return result.value
  setResponseStatus(event, result.code === DISCARD_DOCUMENT_ERROR.NOT_FOUND
    ? 404
    : result.code === DISCARD_DOCUMENT_ERROR.NOT_DISCARDABLE ? 409 : 503)
  return { data: { code: result.code } }
})
