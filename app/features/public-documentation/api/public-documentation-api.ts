import type { PublicDocumentationResponse } from '../../../../shared/documents/public-share-contracts'
import { publicDocumentationResponseSchema } from '../../../../shared/documents/public-share-contracts'
import { decodeApiResponse } from '../../../shared/api/decode-api-response'

export const publicDocumentationApi = {
  async read(token: string, documentId?: string, signal?: AbortSignal): Promise<PublicDocumentationResponse> {
    const suffix = documentId ? `/pages/${encodeURIComponent(documentId)}` : ''
    const response: unknown = await $fetch(`/api/public/documentation/${encodeURIComponent(token)}${suffix}`, { signal })
    return decodeApiResponse(publicDocumentationResponseSchema, response, 'GET /api/public/documentation/[capability]')
  },
}
