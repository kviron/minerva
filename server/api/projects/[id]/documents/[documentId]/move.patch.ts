import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../../shared/projects/constants'
import { moveDocumentBodySchema } from '../../../../../modules/documents/http-schemas'
import { MOVE_DOCUMENT_ERROR, moveDocument } from '../../../../../modules/documents/move-document'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = moveDocumentBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: MOVE_DOCUMENT_ERROR.INVALID_MOVE } }
  }

  const result = await moveDocument({
    ...body.data,
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    documentId: getRouterParam(event, 'documentId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) {
    return result.value
  }

  const status = result.code === MOVE_DOCUMENT_ERROR.INVALID_MOVE
    ? 400
    : result.code === MOVE_DOCUMENT_ERROR.NOT_FOUND ? 404 : 503
  setResponseStatus(event, status)
  return { data: { code: result.code } }
})
