import { createError, defineEventHandler, getValidatedRouterParams, setHeader } from 'h3'
import {
  documentPublicShareListResponseSchema,
  documentPublicShareRouteParamsSchema,
} from '../../../../../../../shared/documents/public-share-contracts'
import { getDocumentPublicShareManagementService } from '../../../../../../modules/documents/document-public-share-runtime'
import { unwrapDocumentPublicShareResult } from '../../../../../../modules/documents/document-public-share-http'
import { requireSession } from '../../../../../../modules/identity/session/require-session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await requireSession(event)
  const params = await getValidatedRouterParams(event, value => documentPublicShareRouteParamsSchema.parse(value))
  const result = await getDocumentPublicShareManagementService().list({
    projectId: params.id,
    rootDocumentId: params.documentId,
    actorUserId: session.user.id,
  })
  return documentPublicShareListResponseSchema.parse(unwrapDocumentPublicShareResult(result))
})
