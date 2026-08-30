import { defineEventHandler, getRouterParam, send, setHeader } from 'h3'
import {
  publicDocumentationUnavailable,
  setPublicDocumentationHeaders,
} from '../../../../../modules/documents/public-documentation-http'
import { getPublicDocumentationRuntime } from '../../../../../modules/documents/public-documentation-runtime'

export default defineEventHandler(async (event) => {
  setPublicDocumentationHeaders(event)
  const runtime = getPublicDocumentationRuntime()
  const image = await runtime.service.resolveImage({
    token: getRouterParam(event, 'token') ?? '',
    imageId: getRouterParam(event, 'imageId') ?? '',
  })
  if (!image) return publicDocumentationUnavailable(event)
  const object = await runtime.imageStorage.get(image.objectKey)
  if (!object) return publicDocumentationUnavailable(event)
  setHeader(event, 'Content-Type', image.mimeType)
  setHeader(event, 'Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(image.filename)}`)
  return send(event, object.bytes)
})
