import { defineEventHandler, getRouterParam, readMultipartFormData, setResponseStatus } from 'h3'
import { AUDIT_CHANNEL } from '../../../../../../shared/projects/constants'
import { DOCUMENT_IMAGE_ERROR, uploadDocumentImage } from '../../../../../modules/files/document-images'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename && part.type)
  if (!file || !file.filename || !file.type) {
    setResponseStatus(event, 400)
    return { data: { code: DOCUMENT_IMAGE_ERROR.INVALID_IMAGE } }
  }
  const result = await uploadDocumentImage({
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    channel: AUDIT_CHANNEL.WEB,
    filename: file.filename,
    mimeType: file.type,
    bytes: file.data,
  })
  if (result.ok) return result.value
  setResponseStatus(event, result.code === DOCUMENT_IMAGE_ERROR.INVALID_IMAGE ? 400 : result.code === DOCUMENT_IMAGE_ERROR.NOT_FOUND ? 404 : 503)
  return { data: { code: result.code } }
})
