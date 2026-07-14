import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../../../../shared/projects/constants'
import {
  DOCUMENT_VERSION_ERROR,
  restoreDocumentVersion,
} from '../../../../../../../modules/documents/document-versions'
import { restoreDocumentVersionBodySchema } from '../../../../../../../modules/documents/http-schemas'
import { requireSession } from '../../../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = restoreDocumentVersionBodySchema.safeParse(await readBody(event))
  const versionNumber = Number(getRouterParam(event, 'versionNumber'))
  if (!body.success || !Number.isInteger(versionNumber) || versionNumber < 1) {
    setResponseStatus(event, 400)
    return { data: { code: DOCUMENT_VERSION_ERROR.INVALID_REQUEST } }
  }
  const result = await restoreDocumentVersion({
    ...body.data,
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    documentId: getRouterParam(event, 'documentId') ?? '',
    versionNumber,
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
