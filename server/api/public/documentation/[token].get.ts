import { defineEventHandler, getRouterParam } from 'h3'
import { publicDocumentationResponseSchema } from '../../../../shared/documents/public-share-contracts'
import {
  publicDocumentationUnavailable,
  setPublicDocumentationHeaders,
} from '../../../modules/documents/public-documentation-http'
import { getPublicDocumentationRuntime } from '../../../modules/documents/public-documentation-runtime'

export default defineEventHandler(async (event) => {
  setPublicDocumentationHeaders(event)
  const token = getRouterParam(event, 'token') ?? ''
  const result = await getPublicDocumentationRuntime().service.readPage({
    token,
    selectedDocumentId: null,
  })
  if (!result) return publicDocumentationUnavailable(event)
  return publicDocumentationResponseSchema.parse(result)
})
