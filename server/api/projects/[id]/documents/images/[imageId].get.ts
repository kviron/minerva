import { createError, defineEventHandler, getQuery, getRouterParam, send, setHeader } from 'h3'
import { readDocumentImage } from '../../../../../modules/files/document-images'
import { requireSession } from '../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const image = await readDocumentImage({
    actorUserId: session.user.id,
    projectId: getRouterParam(event, 'id') ?? '',
    imageId: getRouterParam(event, 'imageId') ?? '',
  })
  if (!image) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const download = getQuery(event).download === '1'
  setHeader(event, 'Content-Type', image.mimeType)
  setHeader(event, 'Content-Disposition', `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(image.filename)}`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return send(event, image.bytes)
})
