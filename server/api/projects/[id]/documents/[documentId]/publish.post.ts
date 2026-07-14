import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../../shared/projects/constants'
import {
  DOCUMENT_VERSION_ERROR,
  publishDocument,
} from '../../../../../modules/documents/document-versions'
import { publishDocumentBodySchema } from '../../../../../modules/documents/http-schemas'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = publishDocumentBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: DOCUMENT_VERSION_ERROR.INVALID_REQUEST } }
  }
  const result = await publishDocument({
    ...body.data,
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    documentId: getRouterParam(event, 'documentId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) {
    return result.value
  }
  setResponseStatus(event, result.code === DOCUMENT_VERSION_ERROR.DRAFT_CONFLICT
    ? 409
    : result.code === DOCUMENT_VERSION_ERROR.INVALID_REQUEST ? 400
      : result.code === DOCUMENT_VERSION_ERROR.NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
