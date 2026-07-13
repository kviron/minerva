import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../shared/projects/constants'
import { CREATE_DOCUMENT_ERROR, createDocument } from '../../../../modules/documents/create-document'
import { createDocumentBodySchema } from '../../../../modules/documents/http-schemas'
import { requireSession } from '../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = createDocumentBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: CREATE_DOCUMENT_ERROR.INVALID_TITLE } }
  }

  const result = await createDocument({
    ...body.data,
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) {
    return result.value
  }

  const status = result.code === CREATE_DOCUMENT_ERROR.NOT_FOUND
    ? 404
    : result.code === CREATE_DOCUMENT_ERROR.INVALID_TITLE ? 400 : 503
  setResponseStatus(event, status)
  return { data: { code: result.code } }
})
