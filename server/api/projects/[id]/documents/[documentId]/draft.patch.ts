import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../../shared/projects/constants'
import { updateDocumentDraftBodySchema } from '../../../../../modules/documents/http-schemas'
import {
  UPDATE_DOCUMENT_DRAFT_ERROR,
  updateDocumentDraft,
} from '../../../../../modules/documents/update-document-draft'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = updateDocumentDraftBodySchema.safeParse(await readBody(event))
  if (!body.success) {
    setResponseStatus(event, 400)
    return { data: { code: UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT } }
  }

  const result = await updateDocumentDraft({
    ...body.data,
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    documentId: getRouterParam(event, 'documentId') ?? '',
    channel: AUDIT_CHANNEL.WEB,
  })
  if (result.ok) {
    return result.value
  }

  const status = result.code === UPDATE_DOCUMENT_DRAFT_ERROR.DRAFT_CONFLICT
    ? 409
    : result.code === UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT ? 400
      : result.code === UPDATE_DOCUMENT_DRAFT_ERROR.NOT_FOUND ? 404 : 503
  setResponseStatus(event, status)
  return { data: { code: result.code } }
})
